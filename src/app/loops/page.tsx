import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import Link from 'next/link'
import LoopActions from '@/components/LoopActions'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const priorityBadge: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border border-red-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  LOW: 'bg-slate-700 text-slate-400 border border-slate-600',
}

const statusBadge: Record<string, string> = {
  PENDING: 'bg-slate-700 text-slate-400',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  DONE: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-slate-800 text-slate-600',
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export default async function LoopsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const userId = session.user.id

  const loops = await safeQuery(sql`
    SELECT *
    FROM "OpenLoop"
    WHERE "userId" = ${userId}
    ORDER BY
      CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END ASC,
      CASE status WHEN 'IN_PROGRESS' THEN 1 WHEN 'PENDING' THEN 2 WHEN 'DONE' THEN 3 WHEN 'CANCELLED' THEN 4 ELSE 5 END ASC,
      "createdAt" DESC
  `) as any[]

  const open = loops.filter(l => l.status !== 'DONE' && l.status !== 'CANCELLED')
  const done = loops.filter(l => l.status === 'DONE' || l.status === 'CANCELLED')
  const overdue = open.filter(l => isOverdue(l.dueDate))
  const critical = open.filter(l => l.priority === 'CRITICAL')

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Open Loops</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track every unresolved decision, task, and follow-up</p>
        </div>
        <Link
          href="/ai?q=What are my most important open loops and what should I do first?"
          className="px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
        >
          🤖 Prioritize with AI
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Open', value: open.length, icon: '🔁', color: 'text-white' },
          { label: 'Critical', value: critical.length, icon: '🔴', color: critical.length > 0 ? 'text-red-400' : 'text-white' },
          { label: 'Overdue', value: overdue.length, icon: '⏰', color: overdue.length > 0 ? 'text-orange-400' : 'text-white' },
          { label: 'Closed', value: done.length, icon: '✅', color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 flex items-center gap-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Open loops list */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1f2937] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Active Loops ({open.length})</h2>
        </div>

        {open.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-semibold text-white mb-1">All clear!</h3>
            <p className="text-slate-500 text-sm">No open loops. Ask your AI CFO to add items as they come up.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1f2937]">
            {open.map(l => (
              <div key={l.id} className={`px-5 py-4 ${isOverdue(l.dueDate) ? 'bg-orange-500/5' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityBadge[l.priority] ?? priorityBadge.LOW}`}>
                        {l.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${statusBadge[l.status] ?? statusBadge.PENDING}`}>
                        {l.status.replace('_', ' ')}
                      </span>
                      {isOverdue(l.dueDate) && (
                        <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white font-medium">{l.text}</p>
                    {l.nextAction && (
                      <p className="text-xs text-[#00e5b0] mt-1">→ {l.nextAction}</p>
                    )}
                    <LoopActions id={l.id} status={l.status} priority={l.priority} />
                  </div>
                  <div className="text-right shrink-0">
                    {l.dueDate && (
                      <div className={`text-xs ${isOverdue(l.dueDate) ? 'text-orange-400' : 'text-slate-500'}`}>
                        Due {new Date(l.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    <div className="text-xs text-slate-600 mt-0.5">
                      {new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Closed loops (collapsed) */}
      {done.length > 0 && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden opacity-60">
          <div className="px-5 py-3 border-b border-[#1f2937]">
            <h2 className="text-sm font-semibold text-slate-400">Closed / Cancelled ({done.length})</h2>
          </div>
          <div className="divide-y divide-[#1f2937]">
            {done.slice(0, 10).map(l => (
              <div key={l.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusBadge[l.status] ?? statusBadge.DONE}`}>
                      {l.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-through">{l.text}</p>
                  {l.closedNote && <p className="text-xs text-slate-600 mt-0.5">{l.closedNote}</p>}
                </div>
                {l.closedAt && (
                  <div className="text-xs text-slate-600 shrink-0">
                    {new Date(l.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loops.length === 0 && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">🔁</div>
          <h3 className="text-lg font-semibold text-white mb-2">No loops yet</h3>
          <p className="text-slate-400 text-sm mb-4">Your AI CFO will add open loops as it identifies unresolved items in your financial life.</p>
          <Link
            href="/ai?q=What open loops do I have in my finances that need attention?"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
          >
            🤖 Ask AI CFO
          </Link>
        </div>
      )}
    </div>
  )
}
