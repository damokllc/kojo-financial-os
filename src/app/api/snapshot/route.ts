import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  try {
    const [accounts, debts, businesses, credit] = await Promise.all([
      sql`SELECT * FROM "FinancialAccount" WHERE "userId" = ${userId} AND "isActive" = true`.catch(() => []),
      sql`SELECT * FROM "Debt" WHERE "userId" = ${userId} AND status != 'PAID'`.catch(() => []),
      sql`SELECT * FROM "Business" WHERE "userId" = ${userId} AND "isActive" = true`.catch(() => []),
      sql`SELECT * FROM "CreditReport" WHERE "userId" = ${userId} ORDER BY "reportDate" DESC LIMIT 1`.catch(() => []),
    ])

    const totalAssets = (accounts as any[]).reduce((s, a) => s + (Number(a.balance) > 0 ? Number(a.balance) : 0), 0)
    const totalLiabilities = (debts as any[]).reduce((s, d) => s + Number(d.currentBalance), 0)
    const netWorth = totalAssets - totalLiabilities
    const liquidCash = (accounts as any[]).filter(a => ['CHECKING','SAVINGS'].includes(a.type))
      .reduce((s, a) => s + Math.max(0, Number(a.balance)), 0)
    const monthlyIncome = (businesses as any[]).reduce((s, b) => s + Number(b.monthlyRevenue || 0), 0)
    const monthlyExpenses = (businesses as any[]).reduce((s, b) => s + Number(b.monthlyExpenses || 0), 0)
    const monthlyDebtService = (debts as any[]).reduce((s, d) => s + Number(d.minimumPayment || 0), 0)
    const businessRevenue = monthlyIncome
    const businessProfit = (businesses as any[]).reduce((s, b) => s + Number(b.monthlyProfit || 0), 0)
    const creditScore = (credit as any[])[0]?.score ?? null

    // Financial freedom score (simple estimate)
    const ffScore = Math.min(100, Math.round((netWorth / 100000) * 20 + 22))
    const creditHealth = creditScore ? Math.round(((Number(creditScore) - 300) / 550) * 100) : null

    const id = crypto.randomUUID()
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // Upsert by snapshotDay (unique constraint added in patch-schema.sql)
    await sql`
      INSERT INTO "FinancialSnapshot" (
        id, "userId", "snapshotDate", "snapshotDay", "netWorth", "totalAssets", "totalLiabilities",
        "liquidCash", "monthlyIncome", "monthlyExpenses", "monthlyDebtService",
        "businessRevenue", "businessProfit", "creditScore",
        "financialFreedomScore", "creditHealthScore", "createdAt"
      ) VALUES (
        ${id}, ${userId}, NOW(), ${today}::date, ${netWorth}, ${totalAssets}, ${totalLiabilities},
        ${liquidCash}, ${monthlyIncome}, ${monthlyExpenses}, ${monthlyDebtService},
        ${businessRevenue}, ${businessProfit}, ${creditScore},
        ${ffScore}, ${creditHealth}, NOW()
      )
      ON CONFLICT ("userId", "snapshotDay") DO UPDATE SET
        "netWorth" = EXCLUDED."netWorth",
        "totalAssets" = EXCLUDED."totalAssets",
        "totalLiabilities" = EXCLUDED."totalLiabilities",
        "liquidCash" = EXCLUDED."liquidCash",
        "monthlyIncome" = EXCLUDED."monthlyIncome",
        "monthlyExpenses" = EXCLUDED."monthlyExpenses",
        "monthlyDebtService" = EXCLUDED."monthlyDebtService",
        "businessRevenue" = EXCLUDED."businessRevenue",
        "businessProfit" = EXCLUDED."businessProfit",
        "creditScore" = EXCLUDED."creditScore",
        "financialFreedomScore" = EXCLUDED."financialFreedomScore",
        "creditHealthScore" = EXCLUDED."creditHealthScore"
    `

    return NextResponse.json({ success: true, netWorth, totalAssets, totalLiabilities, creditScore, liquidCash })
  } catch (e: any) {
    console.error('[snapshot] error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await sql`
      SELECT * FROM "FinancialSnapshot" WHERE "userId" = ${session.user.id}
      ORDER BY "snapshotDate" DESC LIMIT 12
    `
    return NextResponse.json({ snapshots: rows })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
