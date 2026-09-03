'use client'

function fmt(n: number) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs/1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs/1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

export default function NetWorthCard({ netWorth, assets, liabilities }: {
  netWorth: number; assets: number; liabilities: number
}) {
  const isPositive = netWorth >= 0
  return (
    <div className="card">
      <p className="metric-label">Net Worth</p>
      <p className={`metric-value mt-1 ${isPositive ? 'text-[#00e5b0]' : 'text-red-400'}`}>
        {fmt(netWorth)}
      </p>
      <div className="flex gap-4 mt-3 pt-3 border-t border-[#2a3040]">
        <div>
          <p className="text-xs text-slate-500">Assets</p>
          <p className="text-sm font-semibold text-green-400">{fmt(assets)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Liabilities</p>
          <p className="text-sm font-semibold text-red-400">-{fmt(liabilities)}</p>
        </div>
      </div>
    </div>
  )
}
