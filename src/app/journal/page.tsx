import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import Link from 'next/link'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

export default async function JournalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const userId = session.user.id

  const [decisions, memories, goals] = await Promise.all([
    safeQuery(sql`
      SELECT * FROM "Decision"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT 50
    `),
    safeQuery(sql`
      SELECT * FROM "Memory"
      WHERE "userId" = ${userId} AND category != 'WEEKLY_REVIEW'
      ORDER BY "createdAt" DESC
      LIMIT 30
    `),
    safeQuery(sql`
      SELECT * FROM "Goal"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
    `),
  ]) as [any[], any[], any[]]

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Journal</h1>
          <p className="text-slate-400 text-sm mt-0.5">Decisions, lessons, goals, and memory</p>
        </div>
        <Link
          href="/ai?q=I want to log a new financial decision. Ask me what it is."
          className="px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
        >
          🤖 Log with AI
        </Link>
      </div>

      {/* Goals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">🎯 Goals</h2>
          <Link href="/ai?q=Help me define a new financial goal with a clear target and timeline." className="text-xs text-[#00e5b0] hover:underline">+ Add goal</Link>
        </div>
        {goals.length === 0 ? (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">No goals set yet.</p>
            <Link href="/ai?q=Help me set 3 clear financial goals for the next 12 months." className="mt-3 inline-block px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20">
              Set goals with AI CFO →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {goals.map((g: any) => (
              <div key={g.id} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-white flex-1">{g.title || g.description}</p>
                  {g.status && (
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      g.status === 'ACHIEVED' ? 'bg-emerald-500/20 text-emerald-400' :
                      g.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>{g.status}</span>
                  )}
                </div>
                {g.targetAmount && (
                  <p className="text-sm text-[#00e5b0] font-semibold mt-2">
                    Target: ${Number(g.targetAmount).toLocaleString()}
                  </p>
                )}
                {g.targetDate && (
                  <p className="text-xs text-slate-500 mt-1">By {new Date(g.targetDate).toLocaleDateString()}</p>
                )}
                {g.description && g.title && (
                  <p className="text-xs text-slate-500 mt-2">{g.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decisions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">🧠 Decision Log</h2>
          <span className="text-xs text-slate-600">{decisions.length} entries</span>
        </div>
        {decisions.length === 0 ? (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 text-center">
            <p className="text-4xl mb-3">📓</p>
            <p className="text-slate-400 text-sm">No decisions logged yet.</p>
            <p className="text-xs text-slate-600 mt-1">Every major financial move you make gets recorded here with the lesson.</p>
            <Link href="/ai?q=I want to log a financial decision I made recently. Walk me through it." className="mt-3 inline-block px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20">
              Log first decision →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {decisions.map((d: any) => (
              <div key={d.id} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{d.decision}</p>
                    {d.context && <p className="text-xs text-slate-500 mt-1">{d.context}</p>}
                    {d.lesson && (
                      <div className="mt-2 flex items-start gap-2">
                        <span className="text-xs text-yellow-400 flex-shrink-0">💡 Lesson:</span>
                        <p className="text-xs text-yellow-300/80">{d.lesson}</p>
                      </div>
                    )}
                    {d.outcome && (
                      <div className="mt-1 flex items-start gap-2">
                        <span className="text-xs text-slate-500 flex-shrink-0">Outcome:</span>
                        <p className="text-xs text-slate-400">{d.outcome}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 flex-shrink-0">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Memory/Context */}
      {memories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">🗂️ AI Memory</h2>
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
            {memories.map((m: any) => (
              <div key={m.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#1f2937] last:border-0">
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {m.category === 'FINANCIAL' ? '💰' :
                   m.category === 'BUSINESS' ? '🏢' :
                   m.category === 'GOAL' ? '🎯' : '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">{m.value}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
