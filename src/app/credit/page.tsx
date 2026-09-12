import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import Link from 'next/link'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

function scoreColor(score: number | null) {
  if (!score) return 'text-slate-400'
  if (score >= 750) return 'text-emerald-400'
  if (score >= 700) return 'text-blue-400'
  if (score >= 650) return 'text-yellow-400'
  if (score >= 600) return 'text-orange-400'
  return 'text-red-400'
}

function scoreLabel(score: number | null) {
  if (!score) return 'No Data'
  if (score >= 750) return 'Excellent'
  if (score >= 700) return 'Good'
  if (score >= 650) return 'Fair'
  if (score >= 600) return 'Poor'
  return 'Very Poor'
}

function bureauColor(bureau: string) {
  if (bureau === 'EQUIFAX') return 'text-red-400'
  if (bureau === 'EXPERIAN') return 'text-blue-400'
  return 'text-purple-400'
}

export default async function CreditPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const userId = session.user.id

  const [reportRows, allAccountRows, inquiryRows] = await Promise.all([
    safeQuery(sql`
      SELECT id, bureau, "reportDate", score, "uploadedAt", "parseStatus"
      FROM "CreditReport"
      WHERE "userId" = ${userId}
      ORDER BY "reportDate" DESC
    `),
    safeQuery(sql`
      SELECT ca.*, cr.bureau
      FROM "CreditAccount" ca
      JOIN "CreditReport" cr ON ca."reportId" = cr.id
      WHERE cr."userId" = ${userId}
      ORDER BY cr."reportDate" DESC, ca."creditorName" ASC
    `),
    safeQuery(sql`
      SELECT ci.*, cr.bureau
      FROM "CreditInquiry" ci
      JOIN "CreditReport" cr ON ci."reportId" = cr.id
      WHERE cr."userId" = ${userId}
      ORDER BY ci.date DESC
      LIMIT 20
    `),
  ])

  // Latest score per bureau
  const bureauScores: Record<string, { score: number | null; date: string }> = {}
  for (const r of reportRows as any[]) {
    if (!bureauScores[r.bureau]) {
      bureauScores[r.bureau] = { score: r.score, date: r.reportDate }
    }
  }

  // Avg score
  const scores = Object.values(bureauScores).map(b => b.score).filter(Boolean) as number[]
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  // Accounts with issues
  const accounts = allAccountRows as any[]
  const negativeAccounts = accounts.filter(a => a.isCollection || a.isChargeOff || a.latePayments30 > 0 || a.latePayments60 > 0 || a.latePayments90 > 0)
  const disputedAccounts = accounts.filter(a => a.disputeStatus !== 'NOT_DISPUTED')

  const BUREAUS = ['EQUIFAX', 'EXPERIAN', 'TRANSUNION']

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credit Health</h1>
          <p className="text-slate-400 text-sm mt-0.5">Scores, accounts, and dispute tracking across all three bureaus</p>
        </div>
        <Link
          href="/ai?q=Analyze my credit report and tell me what to prioritize"
          className="px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
        >
          🤖 AI Analysis
        </Link>
      </div>

      {/* Score Cards — 4 cols: avg + 3 bureaus */}
      <div className="grid grid-cols-4 gap-4">
        {/* Overall avg */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Average Score</div>
          <div className={`text-5xl font-black mb-1 ${scoreColor(avgScore)}`}>
            {avgScore ?? '—'}
          </div>
          <div className={`text-sm font-medium ${scoreColor(avgScore)}`}>{scoreLabel(avgScore)}</div>
          <div className="mt-3 text-xs text-slate-500">across {scores.length} bureaus</div>
        </div>

        {/* Per bureau */}
        {BUREAUS.map(bureau => {
          const b = bureauScores[bureau]
          return (
            <div key={bureau} className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 text-center">
              <div className={`text-xs uppercase tracking-wider mb-2 font-semibold ${bureauColor(bureau)}`}>{bureau}</div>
              <div className={`text-5xl font-black mb-1 ${scoreColor(b?.score ?? null)}`}>
                {b?.score ?? '—'}
              </div>
              <div className={`text-sm font-medium ${scoreColor(b?.score ?? null)}`}>{scoreLabel(b?.score ?? null)}</div>
              {b?.date && (
                <div className="mt-3 text-xs text-slate-500">
                  {new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
              {!b && <div className="mt-3 text-xs text-slate-600">No report</div>}
            </div>
          )
        })}
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', value: accounts.length, icon: '📋' },
          { label: 'Negative Items', value: negativeAccounts.length, icon: '⚠️', warn: negativeAccounts.length > 0 },
          { label: 'Active Disputes', value: disputedAccounts.length, icon: '⚖️', warn: false },
          { label: 'Hard Inquiries', value: (inquiryRows as any[]).filter(i => i.type === 'hard').length, icon: '🔍' },
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

      {/* Negative Items */}
      {negativeAccounts.length > 0 && (
        <div className="bg-[#111827] border border-red-900/40 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-red-900/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-red-400">⚠️ Negative Items ({negativeAccounts.length})</h2>
            <Link href="/ai?q=How should I handle my negative credit items?" className="text-xs text-slate-500 hover:text-[#00e5b0]">Get AI strategy →</Link>
          </div>
          <div className="divide-y divide-[#1f2937]">
            {negativeAccounts.map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{a.creditorName}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className={bureauColor(a.bureau)}>{a.bureau}</span>
                    {a.accountType && <span>• {a.accountType}</span>}
                    {a.isCollection && <span className="text-red-400">• Collection</span>}
                    {a.isChargeOff && <span className="text-red-400">• Charge-off</span>}
                    {(a.latePayments30 + a.latePayments60 + a.latePayments90) > 0 && (
                      <span className="text-orange-400">
                        • {a.latePayments30}×30 {a.latePayments60}×60 {a.latePayments90}×90 day late
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {a.balance != null && (
                    <div className="text-sm text-red-400">${Number(a.balance).toLocaleString()}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">{a.disputeStatus.replace(/_/g, ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All accounts */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1f2937]">
          <h2 className="text-sm font-semibold text-slate-300">All Credit Accounts ({accounts.length})</h2>
        </div>
        {accounts.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-600 text-sm">
            No credit accounts on file. Upload a credit report to get started.
          </div>
        ) : (
          <div className="divide-y divide-[#1f2937]">
            {accounts.slice(0, 25).map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{a.creditorName}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className={bureauColor(a.bureau)}>{a.bureau}</span>
                    {a.accountType && <span>• {a.accountType}</span>}
                    {a.paymentStatus && <span>• {a.paymentStatus}</span>}
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  {a.balance != null && (
                    <div className="text-sm text-white">${Number(a.balance).toLocaleString()}</div>
                  )}
                  {a.creditLimit != null && (
                    <div className="text-xs text-slate-500">of ${Number(a.creditLimit).toLocaleString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inquiries */}
      {(inquiryRows as any[]).length > 0 && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1f2937]">
            <h2 className="text-sm font-semibold text-slate-300">Recent Inquiries</h2>
          </div>
          <div className="divide-y divide-[#1f2937]">
            {(inquiryRows as any[]).map((i: any) => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{i.creditor}</div>
                  <span className={`text-xs ${bureauColor(i.bureau)}`}>{i.bureau}</span>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${i.type === 'hard' ? 'text-orange-400' : 'text-slate-500'}`}>
                    {i.type || 'Unknown'}
                  </div>
                  {i.date && (
                    <div className="text-xs text-slate-500">
                      {new Date(i.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No reports at all */}
      {reportRows.length === 0 && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📈</div>
          <h3 className="text-lg font-semibold text-white mb-2">No credit reports yet</h3>
          <p className="text-slate-400 text-sm mb-4">Upload reports from Equifax, Experian, and TransUnion to start tracking your credit health.</p>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
          >
            📁 Upload a Document
          </Link>
        </div>
      )}
    </div>
  )
}
