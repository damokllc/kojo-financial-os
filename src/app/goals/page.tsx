import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import Link from 'next/link'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

const categoryIcon: Record<string, string> = {
  SAVINGS: '💰', DEBT_PAYOFF: '🎯', INCOME: '📈', INVESTMENT: '📊',
  BUSINESS: '🏢', CREDIT: '💳', EMERGENCY_FUND: '🛡️', OTHER: '⭐',
}

const priorityColor: Record<string, string> = {
  CRITICAL: 'text-red-400 border-red-400/30 bg-red-400/5',
  HIGH: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  MEDIUM: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  LOW: 'text-slate-400 border-slate-600 bg-slate-800/30',
}

const statusColor: Record<string, string> = {
  ACTIVE: 'text-emerald-400', COMPLETED: 'text-[#00e5b0]',
  PAUSED: 'text-yellow-400', ABANDONED: 'text-slate-600',
}

function progressPct(current: number, target: number | null): number {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function daysUntil(dateStr: string | null): string | null {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Due today'
  if (diff <= 30) return `${diff}d left`
  if (diff <= 365) return `${Math.ceil(diff / 30)}mo left`
  return `${Math.ceil(diff / 365)}yr left`
}

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const userId = session.user.id

  const [goals, accounts, debts] = await Promise.all([
    safeQuery(sql`
      SELECT * FROM "Goal" WHERE "userId" = ${userId}
      ORDER BY
        CASE status WHEN 'ACTIVE' THEN 1 WHEN 'PAUSED' THEN 2 WHEN 'COMPLETED' THEN 3 ELSE 4 END ASC,
        CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC
    `),
    safeQuery(sql`SELECT balance FROM "FinancialAccount" WHERE "userId" = ${userId} AND "isActive" = true`),
    safeQuery(sql`SELECT "currentBalance" FROM "Debt" WHERE "userId" = ${userId} AND status != 'PAID'`),
  ]) as [any[], any[], any[]]

  const totalAssets = accounts.reduce((s, a) => s + (Number(a.balance) > 0 ? Number(a.balance) : 0), 0)
  const totalLiabilities = debts.reduce((s, d) => s + Number(d.currentBalance), 0)
  const netWorth = totalAssets - totalLiabilities

  const activeGoals = goals.filter(g => g.status === 'ACTIVE')
  const completedGoals = goals.filter(g => g.status === 'COMPLETED')
  const totalTargeted = activeGoals.reduce((s, g) => s + Number(g.targetAmount || 0), 0)
  const totalAchieved = activeGoals.reduce((s, g) => s + Number(g.currentAmount || 0), 0)

  return (
    <div className="p-6 space-y-6 text-white max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals & Prosperity</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your path to financial freedom by 2027</p>
        </div>
        <Link
          href="/ai?q=Help me set up financial goals. Ask me about my savings targets, debt payoff goals, income goals, and business milestones."
          className="px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
        >
          🤖 Add Goals with AI
        </Link>
      </div>

      {/* North Star Banner */}
      <div className="bg-gradient-to-r from-[#0a1628] via-[#0d1f3c] to-[#0a1628] border border-[#00e5b0]/20 rounded-2xl p-6">
        <p className="text-xs text-[#00e5b0]/60 uppercase tracking-widest mb-1">North Star</p>
        <p className="text-lg font-semibold text-white">Financial freedom through multiple cash-flowing businesses by 2027</p>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#1f2937]">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Net Worth</p>
            <p className={`text-xl font-bold mt-1 ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netWorth < 0 ? '-' : ''}${fmt(Math.abs(netWorth))}
            </p>
          </div>
          <div className="text-center border-x border-[#1f2937]">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Active Goals</p>
            <p className="text-xl font-bold mt-1 text-[#00e5b0]">{activeGoals.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Goals Completed</p>
            <p className="text-xl font-bold mt-1 text-emerald-400">{completedGoals.length}</p>
          </div>
        </div>
        {totalTargeted > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Overall progress toward active goal targets</span>
              <span>{Math.round((totalAchieved / totalTargeted) * 100)}%</span>
            </div>
            <div className="w-full bg-[#1f2937] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#00e5b0] to-emerald-400 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalAchieved / totalTargeted) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">🎯</p>
          <p className="text-lg font-semibold text-white mb-2">No goals set yet</p>
          <p className="text-slate-400 text-sm mb-6">
            Tell AXIOM your financial goals and it will track them for you — savings targets, debt payoff milestones, income goals, business growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {[
              ['Save $10k emergency fund', 'EMERGENCY_FUND'],
              ['Pay off credit card debt', 'DEBT_PAYOFF'],
              ['Reach $5k/mo business income', 'INCOME'],
              ['Improve credit score to 750', 'CREDIT'],
            ].map(([label, cat]) => (
              <Link
                key={label}
                href={`/ai?q=Set a goal for me: ${label}`}
                className="px-4 py-2 bg-[#0a1628] border border-[#1f2937] text-slate-300 rounded-lg text-sm hover:border-[#00e5b0]/40 hover:text-[#00e5b0] transition-all"
              >
                {categoryIcon[cat]} {label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Active Goals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map((g: any) => {
                  const pct = progressPct(Number(g.currentAmount), Number(g.targetAmount))
                  const remaining = g.targetAmount ? Number(g.targetAmount) - Number(g.currentAmount) : null
                  const due = daysUntil(g.targetDate)
                  return (
                    <div key={g.id} className={`bg-[#111827] border rounded-xl p-5 ${priorityColor[g.priority] || 'border-[#1f2937]'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{categoryIcon[g.category] || '⭐'}</span>
                          <div>
                            <p className="text-sm font-semibold text-white">{g.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{g.category.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor[g.priority] || ''}`}>
                          {g.priority}
                        </span>
                      </div>

                      {g.targetAmount && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>${fmt(Number(g.currentAmount))} saved</span>
                            <span>{pct}% of ${fmt(Number(g.targetAmount))}</span>
                          </div>
                          <div className="w-full bg-[#1f2937] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#00e5b0] to-blue-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {remaining !== null && remaining > 0 && (
                            <p className="text-xs text-slate-600 mt-1">${fmt(remaining)} to go</p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {due && (
                          <span className={`text-xs ${due === 'Overdue' ? 'text-red-400' : 'text-slate-500'}`}>
                            📅 {due}
                          </span>
                        )}
                        <Link
                          href={`/ai?q=Give me a strategy to achieve my goal: ${g.title}. Current progress: $${fmt(Number(g.currentAmount))}${g.targetAmount ? ` of $${fmt(Number(g.targetAmount))}` : ''}.`}
                          className="ml-auto text-xs text-[#00e5b0] hover:underline"
                        >
                          🤖 Get strategy →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Completed 🎉</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completedGoals.map((g: any) => (
                  <div key={g.id} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 opacity-70">
                    <div className="flex items-center gap-2">
                      <span>{categoryIcon[g.category] || '⭐'}</span>
                      <p className="text-sm text-slate-300 line-through">{g.title}</p>
                      <span className="ml-auto text-xs text-emerald-400">✅ Done</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AXIOM Suggestions */}
      <div className="bg-[#0a1628] border border-[#00e5b0]/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#00e5b0]">AXIOM can manage your goals</p>
            <p className="text-xs text-slate-400 mt-1">
              Just tell AXIOM what you're working toward. It will create the goal, search for grants or programs to help, and build a strategy to get you there.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                'Search for grants I can apply for this month',
                'Build me a debt-free timeline',
                'What should my next financial goal be?',
                'Help me find additional income streams',
              ].map(prompt => (
                <Link
                  key={prompt}
                  href={`/ai?q=${encodeURIComponent(prompt)}`}
                  className="px-3 py-1.5 text-xs bg-[#111827] border border-[#1f2937] text-slate-300 rounded-lg hover:border-[#00e5b0]/40 hover:text-[#00e5b0] transition-all"
                >
                  {prompt}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
