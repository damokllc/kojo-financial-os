import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'

// Parse a CSV string into rows
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())
  const rows: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const values = splitCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').replace(/^"|"$/g, '').trim()
    })
    rows.push(row)
  }
  return rows
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}

// Try to detect the column layout from common bank CSV formats
function detectColumns(headers: string[]) {
  const find = (opts: string[]) => headers.find(h => opts.some(o => h.includes(o)))
  return {
    date: find(['date', 'posted', 'transaction date', 'trans date']),
    description: find(['description', 'memo', 'payee', 'merchant', 'name', 'details']),
    amount: find(['amount', 'debit', 'credit', 'transaction amount']),
    debit: find(['debit', 'withdrawal', 'charge']),
    credit: find(['credit', 'deposit', 'payment']),
    category: find(['category', 'type']),
  }
}

function parseAmount(val: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1')
  return parseFloat(cleaned) || 0
}

function parseDate(val: string): string | null {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  } catch { return null }
}

// POST — parse CSV and return preview (don't save yet)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const accountId = formData.get('accountId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) return NextResponse.json({ error: 'CSV is empty or unreadable' }, { status: 400 })

  const headers = Object.keys(rows[0])
  const cols = detectColumns(headers)

  const transactions = rows.map((row, i) => {
    const dateStr = cols.date ? parseDate(row[cols.date]) : null
    const description = cols.description ? row[cols.description] : `Row ${i + 1}`

    let amount = 0
    if (cols.amount) {
      amount = parseAmount(row[cols.amount])
    } else if (cols.credit && cols.debit) {
      const credit = parseAmount(row[cols.credit])
      const debit = parseAmount(row[cols.debit])
      amount = credit - debit
    }

    const category = cols.category ? row[cols.category] : null

    return { date: dateStr, description, amount, category, raw: row }
  }).filter(tx => tx.date && tx.description)

  return NextResponse.json({
    preview: transactions.slice(0, 10),
    total: transactions.length,
    detectedColumns: cols,
    headers,
  })
}

// PUT — confirm and save transactions to DB
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { transactions, accountId } = await req.json()
  if (!Array.isArray(transactions)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  let saved = 0
  for (const tx of transactions) {
    if (!tx.date || !tx.description) continue
    const id = crypto.randomUUID()
    try {
      await sql`
        INSERT INTO "Transaction"
          (id, "userId", "accountId", date, description, amount, category, "isRecurring", "dataStatus", "createdAt", "updatedAt")
        VALUES
          (${id}, ${userId}, ${accountId ?? null}, ${tx.date}::date, ${tx.description},
           ${tx.amount}, ${tx.category ?? null}, false, 'USER_PROVIDED', NOW(), NOW())
      `
      saved++
    } catch { /* skip dupes */ }
  }

  return NextResponse.json({ success: true, saved })
}
