export default function ScoresCard() {
  // Static placeholder — real calculation done in AI context
  const scores = [
    { label: 'Financial Freedom', value: 22, color: '#ef4444' },
    { label: 'Credit Health',     value: 35, color: '#f59e0b' },
    { label: 'Business Health',   value: 28, color: '#f59e0b' },
    { label: 'Data Quality',      value: 45, color: '#3b82f6' },
  ]
  return (
    <div className="card">
      <p className="metric-label">Financial Scores</p>
      <div className="mt-3 space-y-2.5">
        {scores.map(s => (
          <div key={s.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400">{s.label}</span>
              <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}/100</span>
            </div>
            <div className="h-1.5 bg-[#2a3040] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${s.value}%`, background: s.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
