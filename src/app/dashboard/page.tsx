import Link from 'next/link'
import { auth } from '@/lib/auth'
import { sql } from '@/lib/db/neon'
import { Metadata } from 'next'
import NetWorthCard from '@/components/dashboard/NetWorthCard'
import CashFlowCard from '@/components/dashboard/CashFlowCard'
import CreditScoreCard from '@/components/dashboard/CreditScoreCard'
import ScoresCard from '@/components/dashboard/ScoresCard'
import OpenLoopsWidget from '@/components/dashboard/OpenLoopsWidget'
import BusinessGradeWidget from '@/components/dashboard/BusinessGradeWidget'
import QuickAICard from '@/components/dashboard/QuickAICard'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!


  // Parallel data fetch via Neon HTTP client (bypasses Prisma pg driver SCRAM-SHA-256-PLUS auth issue)
  const [profileRows, accountRows, debtRows, loopRows, creditRows, businessRows] = await Promise.all([
    safeQuery(sql`SELECT * FROM "Profile" WHERE "userId" = ${userId} LIMIT 1`),
    safeQuery(sql`SELECT * FROM "FinancialAccount" WHERE "userId" = ${userId} AND "isActive" = true`),
    safeQuery(sql`SELECT * FROM "Debt" WHERE "userId" = ${userId} AND status != 'PAID'`),
    safeQuery(sql`
      SELECT * FROM "OpenLoop"
      WHERE "userId" = ${userId} AND status != 'DONE'
      ORDER BY
        CASE priority
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END ASC
      LIMIT 5
    `),
    safeQuery(sql`SELECT * FROM "CreditReport" WHERE "userId" = ${userId} ORDER BY "reportDate" DESC LIMIT 1`),
    safeQuery(sql`
      SELECT * FROM "Business"
      WHERE "userId" = ${userId} AND "isActive" = true
      ORDER BY
        CASE grade
          WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3
          WHEN 'D' THEN 4 WHEN 'E' THEN 5 WHEN 'F' THEN 6 WHEN 'G' THEN 7
          ELSE 8
        END ASC
    `),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileRows[0] as any) ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = accountRows as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debts = debtRows as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openLoops = loopRows as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credit = (creditRows[0] as any) ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const businesses = businessRows as any[]

  const totalAssets = accounts.reduce((sum, a) => sum + (Number(a.balance) > 0 ? Number(a.balance) : 0), 0)
  const totalLiabilities =
    debts.reduce((sum, d) => sum + Number(d.currentBalance), 0) +
    accounts.reduce((sum, a) => sum + (Number(a.balance) < 0 ? Math.abs(Number(a.balance)) : 0), 0)
  const netWorth = totalAssets - totalLiabilities

  // Fire-and-forget daily net worth snapshot (non-blocking)
  ;(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const snapId = crypto.randomUUID()
      const snapAssets = accounts.reduce((s: number, a: any) => s + (Number(a.balance) > 0 ? Number(a.balance) : 0), 0)
      const snapLiabilities = debts.reduce((s: number, d: any) => s + Number(d.currentBalance), 0)
      const snapNW = snapAssets - snapLiabilities
      await sql`
        INSERT INTO "FinancialSnapshot" (id, "userId", "snapshotDate", "snapshotDay", "netWorth", "totalAssets", "totalLiabilities", "liquidCash", "monthlyIncome", "monthlyExpenses", "monthlyDebtService", "businessRevenue", "businessProfit", "creditScore", "createdAt")
        VALUES (${snapId}, ${userId}, NOW(), ${today}::date, ${snapNW}, ${snapAssets}, ${snapLiabilities}, ${snapAssets}, 0, 0, 0, 0, 0, ${(creditRows[0] as any)?.score ?? null}, NOW())
        ON CONFLICT ("userId", "snapshotDay") DO UPDATE SET "netWorth" = EXCLUDED."netWorth", "totalAssets" = EXCLUDED."totalAssets", "totalLiabilities" = EXCLUDED."totalLiabilities"
      `
    } catch { /* non-fatal */ }
  })()

  const displayName =
    profile?.preferredName ||
    profile?.altName ||
    session?.user?.name?.split(' ')[0] ||
    'Kojo'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {getTimeOfDay()}, {displayName} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Here&apos;s your financial picture.</p>
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <NetWorthCard netWorth={netWorth} assets={totalAssets} liabilities={totalLiabilities} />
        <CashFlowCard />
        <CreditScoreCard report={credit} />
        <ScoresCard />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <OpenLoopsWidget loops={openLoops} />
        </div>
        <BusinessGradeWidget businesses={businesses} />
      </div>

      {/* Quick AI */}
      <QuickAICard />

      {/* Weekly Review CTA */}
      <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-sm font-semibold text-white">AXIOM Weekly Review</p>
            <p className="text-xs text-slate-400">Get your Top 3 actions, portfolio status, and financial briefing</p>
          </div>
        </div>
        <Link
          href="/review"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          Open Review →
        </Link>
      </div>
    </div>
  )
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
