import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import Link from 'next/link'
import BusinessCardActions from '@/components/BusinessCardActions'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

const gradeConfig: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  A: { label: 'A', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30', desc: 'Cash-flowing' },
  B: { label: 'B', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30', desc: 'Near-term revenue' },
  C: { label: 'C', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', desc: 'Long-term asset' },
  D: { label: 'D', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30', desc: 'Speculative' },
  E: { label: 'E', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', desc: 'Distraction' },
  F: { label: 'F', color: 'text-slate-500', bg: 'bg-slate-700 border-slate-600', desc: 'Pause' },
  G: { label: 'G', color: 'text-slate-600', bg: 'bg-slate-800 border-slate-700', desc: 'Exit' },
}

const priorityConfig: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  P0: { label: 'P0', color: 'text-red-300', bg: 'bg-red-500/20 border-red-500/40', desc: 'Survival' },
  P1: { label: 'P1', color: 'text-orange-300', bg: 'bg-orange-500/20 border-orange-500/40', desc: 'Cash Generator' },
  P2: { label: 'P2', color: 'text-yellow-300', bg: 'bg-yellow-500/20 border-yellow-500/40', desc: 'Core Business' },
  P3: { label: 'P3', color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-500/40', desc: 'Strategic Build' },
  P4: { label: 'P4', color: 'text-slate-400', bg: 'bg-slate-700 border-slate-600', desc: 'Experimental' },
}

const stateConfig: Record<string, { color: string; dot: string; label: string }> = {
  ACTIVE:    { color: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Active' },
  QUEUED:    { color: 'text-blue-400',    dot: 'bg-blue-400',    label: 'Queued' },
  PARKED:    { color: 'text-yellow-400',  dot: 'bg-yellow-400',  label: 'Parked' },
  ABANDONED: { color: 'text-slate-500',   dot: 'bg-slate-500',   label: 'Abandoned' },
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

const STATE_ORDER = ['ACTIVE', 'QUEUED', 'PARKED', 'ABANDONED']
const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4']

export default async function BusinessesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const userId = session.user.id

  const businesses = await safeQuery(sql`
    SELECT b.*,
      (SELECT bs."weightedTotal" FROM "BusinessScore" bs WHERE bs."businessId" = b.id ORDER BY bs."scoredAt" DESC LIMIT 1) AS latest_score
    FROM "Business" b
    WHERE b."userId" = ${userId}
    ORDER BY
      CASE COALESCE(b."projectState",'ACTIVE')
        WHEN 'ACTIVE' THEN 1 WHEN 'QUEUED' THEN 2 WHEN 'PARKED' THEN 3 ELSE 4 END ASC,
      CASE COALESCE(b.priority,'P3')
        WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 ELSE 5 END ASC,
      CASE b.grade WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4 WHEN 'E' THEN 5 WHEN 'F' THEN 6 WHEN 'G' THEN 7 ELSE 8 END ASC
  `) as any[]

  const byState: Record<string, any[]> = { ACTIVE: [], QUEUED: [], PARKED: [], ABANDONED: [] }
  for (const b of businesses) {
    const state = b.projectState ?? 'ACTIVE'
    if (byState[state]) byState[state].push(b)
    else byState['ACTIVE'].push(b)
  }

  const active = byState['ACTIVE']
  const totalMonthlyRevenue = active.reduce((s, b) => s + Number(b.monthlyRevenue || 0), 0)
  const totalMonthlyProfit  = active.reduce((s, b) => s + Number(b.monthlyProfit  || 0), 0)
  const totalMonthlyExpenses= active.reduce((s, b) => s + Number(b.monthlyExpenses|| 0), 0)

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Business Portfolio</h1>
          <p className="text-slate-400 text-sm mt-0.5">Prioritized by P0–P4 · Organized by state · Graded by performance</p>
        </div>
        <Link
          href="/ai?q=Run the Axiom Decision Framework on my business portfolio. Score each project P0–P4, classify as ACTIVE/QUEUED/PARKED/ABANDONED, and tell me the top 3 actions for this week."
          className="px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
        >
          🤖 Run Decision Framework
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Ventures', value: active.length.toString(), icon: '🏢' },
          { label: 'Monthly Revenue', value: fmt(totalMonthlyRevenue), icon: '💰' },
          { label: 'Monthly Expenses', value: fmt(totalMonthlyExpenses), icon: '📤', warn: totalMonthlyExpenses > totalMonthlyRevenue },
          { label: 'Monthly Profit', value: fmt(totalMonthlyProfit), icon: totalMonthlyProfit >= 0 ? '📈' : '📉', warn: totalMonthlyProfit < 0 },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 flex items-center gap-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className={`text-2xl font-bold ${s.warn ? 'text-red-400' : 'text-white'}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-600">Priority:</span>
          {Object.entries(priorityConfig).map(([p, cfg]) => (
            <span key={p} className={`px-2 py-0.5 rounded text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
              {p} {cfg.desc}
            </span>
          ))}
        </div>
      </div>

      {/* Sections by state */}
      {STATE_ORDER.map(state => {
        const list = byState[state]
        if (!list?.length) return null
        const sc = stateConfig[state]
        return (
          <div key={state} className="space-y-3">
            {/* State header */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sc.dot}`}></span>
              <h2 className={`text-sm font-semibold ${sc.color}`}>{sc.label}</h2>
              <span className="text-xs text-slate-600">({list.length})</span>
              {state === 'PARKED' && <span className="text-xs text-slate-600 ml-1">— good ideas waiting their turn</span>}
              {state === 'QUEUED' && <span className="text-xs text-slate-600 ml-1">— approved, not yet started</span>}
              {state === 'ABANDONED' && <span className="text-xs text-slate-600 ml-1">— no longer pursuing</span>}
            </div>

            {list.map(b => {
              const gcfg = gradeConfig[b.grade] ?? gradeConfig.D
              const pcfg = priorityConfig[b.priority ?? 'P3'] ?? priorityConfig.P3
              const margin = b.monthlyRevenue > 0 ? (Number(b.monthlyProfit) / Number(b.monthlyRevenue) * 100) : 0
              const dimmed = state !== 'ACTIVE'

              return (
                <div key={b.id} className={`bg-[#111827] border border-[#1f2937] rounded-xl p-5 transition-opacity ${dimmed ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Grade */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black border ${gcfg.bg} ${gcfg.color} shrink-0`}>
                      {b.grade}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="text-base font-bold text-white truncate">{b.name}</h3>
                        {/* Priority badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${pcfg.bg} ${pcfg.color}`}>
                          {b.priority ?? 'P3'} · {pcfg.desc}
                        </span>
                        {b.isGhana && <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">🇬🇭</span>}
                        {b.entityType && <span className="text-xs text-slate-500">{b.entityType}</span>}
                      </div>
                      {b.description && <p className="text-sm text-slate-400 mb-2 line-clamp-2">{b.description}</p>}

                      <div className="grid grid-cols-3 gap-3 mt-1">
                        <div>
                          <div className="text-xs text-slate-500">Revenue/mo</div>
                          <div className="text-sm font-semibold text-white">{fmt(Number(b.monthlyRevenue))}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Expenses/mo</div>
                          <div className="text-sm font-semibold text-white">{fmt(Number(b.monthlyExpenses))}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Profit/mo</div>
                          <div className={`text-sm font-semibold ${Number(b.monthlyProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {fmt(Number(b.monthlyProfit))}
                            {b.monthlyRevenue > 0 && <span className="text-xs text-slate-500 ml-1">({margin.toFixed(0)}%)</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="text-right shrink-0 space-y-1">
                      {b.latest_score != null && (
                        <div className="text-xs text-slate-400">Score <span className="text-white font-semibold">{Number(b.latest_score).toFixed(1)}</span></div>
                      )}
                      {b.startDate && (
                        <div className="text-xs text-slate-600">
                          Since {new Date(b.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                      )}
                      <Link
                        href={`/ai?q=Axiom Decision Framework: analyze ${encodeURIComponent(b.name)}. Score it on all 10 dimensions, assign P0–P4 priority, ACTIVE/QUEUED/PARKED/ABANDONED state, and give me one next action.`}
                        className="block text-xs text-[#00e5b0] hover:underline"
                      >
                        Framework →
                      </Link>
                    </div>
                  </div>

                  {(b.grade === 'F' || b.grade === 'G') && (
                    <div className="mt-3 pt-3 border-t border-[#1f2937] flex items-center gap-2">
                      <span className="text-xs text-red-400">⚠️ {b.grade === 'G' ? 'Exit candidate' : 'Paused'}</span>
                      {b.notes && <span className="text-xs text-slate-500">• {b.notes}</span>}
                    </div>
                  )}
                  <BusinessCardActions
                    id={b.id}
                    grade={b.grade ?? 'C'}
                    priority={b.priority ?? 'P3'}
                    projectState={b.projectState ?? 'ACTIVE'}
                  />
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Empty state */}
      {businesses.length === 0 && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">🏢</div>
          <h3 className="text-lg font-semibold text-white mb-2">No ventures tracked yet</h3>
          <p className="text-slate-400 text-sm mb-4">Add your projects and Axiom will help you prioritize and grade them.</p>
          <Link
            href="/ai?q=Help me add all my businesses and projects to Axiom. I'll describe them and you classify each with a grade, P0–P4 priority, and project state."
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
          >
            🤖 Add all projects with AI
          </Link>
        </div>
      )}

      {/* Grade legend */}
      <div className="flex items-center gap-2 flex-wrap border-t border-[#1f2937] pt-4">
        <span className="text-xs text-slate-600">Grade:</span>
        {Object.entries(gradeConfig).map(([g, cfg]) => (
          <span key={g} className={`px-2 py-0.5 rounded text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
            {g} — {cfg.desc}
          </span>
        ))}
      </div>
    </div>
  )
}
