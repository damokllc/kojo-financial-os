'use client'

import dynamic from 'next/dynamic'
import CSVImport from './CSVImport'

// PlaidLink uses browser-only APIs — load client-side only.
// Always show a placeholder button while the chunk loads so the UI isn't empty.
const PlaidLink = dynamic(() => import('./PlaidLink'), {
  ssr: false,
  loading: () => (
    <button
      disabled
      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700/60 cursor-not-allowed text-white rounded-lg text-sm font-medium"
    >
      🏦 Connect Bank / Credit Card
    </button>
  ),
})

interface Props {
  accounts: { id: string; name: string; institution: string | null }[]
}

export default function FinanceConnect({ accounts }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[#0f1623] border border-[#1e2a3a] rounded-xl">
      <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Connect</span>
      <PlaidLink />
      <CSVImport accounts={accounts} onImported={() => window.location.reload()} />
      <a
        href="/ai?prompt=Give+me+a+full+financial+intake.+Ask+me+about+all+my+accounts,+debts,+income,+crypto,+and+businesses+one+section+at+a+time.+Save+everything+as+I+tell+you."
        className="flex items-center gap-2 px-3 py-2 bg-[#1a2236] hover:bg-[#1e2a40] border border-[#2a3040] text-slate-200 rounded-lg text-sm transition-colors"
      >
        <span>🧠</span> Axiom Intake
      </a>
    </div>
  )
}
