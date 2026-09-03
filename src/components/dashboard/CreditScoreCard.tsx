interface CreditReport { score: number | null; bureau?: string; reportDate?: Date }

function scoreColor(s: number) {
  if (s >= 740) return 'text-[#00e5b0]'
  if (s >= 670) return 'text-blue-400'
  if (s >= 580) return 'text-amber-400'
  return 'text-red-400'
}
function scoreLabel(s: number) {
  if (s >= 800) return 'Exceptional'
  if (s >= 740) return 'Very Good'
  if (s >= 670) return 'Good'
  if (s >= 580) return 'Fair'
  return 'Poor'
}

export default function CreditScoreCard({ report }: { report: CreditReport | null }) {
  const score = report?.score ?? null
  return (
    <div className="card">
      <p className="metric-label">Credit Score</p>
      {score ? (
        <>
          <p className={`metric-value mt-1 ${scoreColor(score)}`}>{score}</p>
          <div className="mt-3 pt-3 border-t border-[#2a3040]">
            <p className="text-sm font-medium text-slate-300">{scoreLabel(score)}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {report?.bureau} · {report?.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'No date'}
            </p>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-slate-500 text-sm">No report uploaded</p>
          <a href="/credit" className="text-[#00e5b0] text-xs mt-2 inline-block hover:underline">
            Upload credit report →
          </a>
        </div>
      )}
    </div>
  )
}
