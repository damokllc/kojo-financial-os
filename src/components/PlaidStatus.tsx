'use client'

import { useEffect, useState } from 'react'

interface LinkedBank {
  id: string
  institutionName: string
  lastSync: string | null
  accountCount: number
}

export default function PlaidStatus() {
  const [banks, setBanks] = useState<LinkedBank[]>([])
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plaid/status').then(r => r.json()).then(d => setBanks(d.banks ?? []))
  }, [])

  if (!banks.length) return null

  const syncAll = async () => {
    setSyncing(true)
    setMsg(null)
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        setMsg(`✅ ${d.accountsUpdated} accounts · ${d.transactionsAdded} new transactions`)
        setTimeout(() => window.location.reload(), 1200)
      } else {
        setMsg(`❌ ${d.error}`)
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#00e5b0] uppercase tracking-wider">🏦 Linked Banks</span>
        <button
          onClick={syncAll}
          disabled={syncing}
          className="text-xs px-3 py-1 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg hover:bg-[#00e5b0]/20 disabled:opacity-50 transition-all"
        >
          {syncing ? 'Syncing…' : '🔄 Sync Now'}
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {banks.map(b => (
          <div key={b.id} className="flex items-center gap-2 text-sm">
            <span className="text-emerald-400">●</span>
            <span className="text-white font-medium">{b.institutionName}</span>
            <span className="text-slate-500 text-xs">
              {b.accountCount} account{b.accountCount !== 1 ? 's' : ''}
              {b.lastSync ? ` · synced ${new Date(b.lastSync).toLocaleDateString()}` : ' · never synced'}
            </span>
          </div>
        ))}
      </div>
      {msg && <p className="text-xs text-slate-300 mt-2">{msg}</p>}
    </div>
  )
}
