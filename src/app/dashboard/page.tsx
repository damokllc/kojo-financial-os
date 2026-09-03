import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { Metadata } from 'next'
import NetWorthCard from '@/components/dashboard/NetWorthCard'
import CashFlowCard from '@/components/dashboard/CashFlowCard'
import CreditScoreCard from '@/components/dashboard/CreditScoreCard'
import ScoresCard from '@/components/dashboard/ScoresCard'
import OpenLoopsWidget from '@/components/dashboard/OpenLoopsWidget'
import BusinessGradeWidget from '@/components/dashboard/BusinessGradeWidget'
import QuickAICard from '@/components/dashboard/QuickAICard'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  // Parallel data fetch
  const [profile, accounts, debts, openLoops, credit, businesses] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.financialAccount.findMany({ where: { userId, isActive: true } }),
    db.debt.findMany({ where: { userId, isActive: true } }),
    db.openLoop.findMany({ where: { userId, status: { not: 'DONE' } }, orderBy: { priority: 'asc' }, take: 5 }),
    db.creditReport.findFirst({ where: { userId }, orderBy: { reportDate: 'desc' } }),
    db.business.findMany({ where: { userId, isActive: true }, orderBy: { grade: 'asc' } }),
  ])

  const totalAssets = accounts.reduce((sum, a) => sum + (a.balance > 0 ? a.balance : 0), 0)
  const totalLiabilities = debts.reduce((sum, d) => sum + d.currentBalance, 0) +
    accounts.reduce((sum, a) => sum + (a.balance < 0 ? Math.abs(a.balance) : 0), 0)
  const netWorth = totalAssets - totalLiabilities

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {getTimeOfDay()}, {profile?.displayName || session?.user?.name?.split(' ')[0] || 'Kojo'} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Here's your financial picture.</p>
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
    </div>
  )
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
