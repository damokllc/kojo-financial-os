import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'
import { z } from 'zod'

const bodySchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number(), // positive = income, negative = expense
  category: z.string().optional(),
  date: z.string().optional(), // ISO date string
  accountId: z.string().optional(),
  businessId: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: z.infer<typeof bodySchema>
  try { body = bodySchema.parse(await req.json()) } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const txDate = body.date ? new Date(body.date) : new Date()
  const id = crypto.randomUUID()

  try {
    await sql`
      INSERT INTO "Transaction" (id, "userId", "accountId", "businessId", date, description, amount, category, "isRecurring", notes, "dataStatus", "createdAt", "updatedAt")
      VALUES (
        ${id}, ${userId}, ${body.accountId ?? null}, ${body.businessId ?? null},
        ${txDate.toISOString()}, ${body.description}, ${body.amount},
        ${body.category ?? null}, ${body.isRecurring ?? false}, ${body.notes ?? null},
        'USER_PROVIDED', NOW(), NOW()
      )
    `

    // If this is a positive amount (income) and accountId given, update account balance
    if (body.accountId) {
      await sql`
        UPDATE "FinancialAccount"
        SET balance = balance + ${body.amount}, "updatedAt" = NOW()
        WHERE id = ${body.accountId} AND "userId" = ${userId}
      `.catch(() => {}) // non-fatal
    }

    return NextResponse.json({ success: true, id })
  } catch (err: any) {
    console.error('[transactions] error:', err.message)
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  try {
    const rows = await sql`
      SELECT t.*, fa.name as "accountName", b.name as "businessName"
      FROM "Transaction" t
      LEFT JOIN "FinancialAccount" fa ON t."accountId" = fa.id
      LEFT JOIN "Business" b ON t."businessId" = b.id
      WHERE t."userId" = ${userId}
      ORDER BY t.date DESC, t."createdAt" DESC
      LIMIT ${limit}
    `
    const totals = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as "totalIncome",
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as "totalExpenses"
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND date >= date_trunc('month', NOW())
    `
    return NextResponse.json({ transactions: rows, monthlyTotals: totals[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
