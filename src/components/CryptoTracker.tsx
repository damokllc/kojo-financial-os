'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const POPULAR = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'USDC', 'ADA', 'AVAX', 'DOGE', 'MATIC']

interface Holding {
  id?: string        // FinancialAccount id if saved
  symbol: string
  amount: number
  accountId?: string
}

interface PriceInfo {
  usd: number
  usd_24h_change: number
}

export default function CryptoTracker({ savedAccounts }: { savedAccounts: { id: string; name: string; institution?: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({})
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [addSymbol, setAddSymbol] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Load saved crypto accounts from props
  useEffect(() => {
    const crypto = savedAccounts
      .filter(a => a.institution?.startsWith('crypto:') || a.name.match(/^[A-Z]{2,6}$/))
      .map(a => ({
        id: a.id,
        symbol: a.institution?.replace('crypto:', '') || a.name,
        amount: 0, // balance stored separately in account
        accountId: a.id,
      }))
    if (crypto.length > 0) setHoldings(crypto)
  }, [savedAccounts])

  const fetchPrices = useCallback(async (syms: string[]) => {
    if (!syms.length) return
    setLoadingPrices(true)
    try {
      const res = await fetch(`/api/crypto/prices?symbols=${syms.join(',')}`)
      const data = await res.json()
      const p: Record<string, PriceInfo> = {}
      for (const [key, val] of Object.entries(data.prices || {})) {
        p[key.toUpperCase()] = val as PriceInfo
      }
      // Also map by gecko id to symbol
      for (const sym of syms) {
        const lower = sym.toLowerCase()
        const match = Object.entries(data.prices || {}).find(([k]) => k === lower || k.startsWith(sym.toLowerCase().replace('/', '-')))
        if (match) p[sym] = match[1] as PriceInfo
      }
      setPrices(prev => ({ ...prev, ...p }))
      setLastRefresh(new Date())
    } catch {}
    setLoadingPrices(false)
  }, [])

  // Fetch prices when holdings change
  useEffect(() => {
    const syms = holdings.map(h => h.symbol)
    if (syms.length) fetchPrices(syms)
  }, [holdings.map(h => h.symbol).join(',')])

  function getPrice(sym: string): PriceInfo | null {
    return prices[sym.toUpperCase()] || prices[sym.toLowerCase()] || null
  }

  function totalPortfolioValue() {
    return holdings.reduce((sum, h) => {
      const p = getPrice(h.symbol)
      return sum + (p ? p.usd * h.amount : 0)
    }, 0)
  }

  async function addHolding() {
    if (!addSymbol || !addAmount) return
    const sym = addSymbol.toUpperCase().trim()
    const amt = parseFloat(addAmount)
    if (isNaN(amt) || amt <= 0) return
    setSaving(true)
    try {
      // Save as a FinancialAccount with type CRYPTO
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sym,
          type: 'CRYPTO',
          institution: `crypto:${sym}`,
          balance: amt,
          currency: sym,
          notes: `Crypto holding: ${amt} ${sym}`,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const { id } = await res.json()
      setHoldings(prev => [...prev, { id, symbol: sym, amount: amt, accountId: id }])
      setAddSymbol('')
      setAddAmount('')
      setFlash(`✅ Added ${amt} ${sym}`)
      setTimeout(() => setFlash(null), 2000)
      router.refresh()
    } catch {
      setFlash('⚠️ Failed to save')
      setTimeout(() => setFlash(null), 3000)
    }
    setSaving(false)
  }

  async function removeHolding(h: Holding) {
    if (!h.id) { setHoldings(prev => prev.filter(x => x !== h)); return }
    try {
      await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: h.id, isActive: false }),
      })
      setHoldings(prev => prev.filter(x => x !== h))
      router.refresh()
    } catch {}
  }

  const portfolioValue = totalPortfolioValue()

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-500/20 transition-all"
      >
        <span className="text-lg">₿</span>
        Crypto Portfolio
        {portfolioValue > 0 && (
          <span className="ml-1 text-xs bg-purple-500/20 px-2 py-0.5 rounded-full">
            ${portfolioValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="bg-[#111827] border border-purple-500/30 rounded-2xl p-5 mb-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Crypto Portfolio</h3>
          {portfolioValue > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              Total:{' '}
              <span className="text-purple-400 font-semibold">
                ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {loadingPrices && <span className="ml-2 text-slate-600">refreshing…</span>}
              {lastRefresh && !loadingPrices && (
                <span className="ml-2 text-slate-700">
                  as of {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPrices(holdings.map(h => h.symbol))}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded bg-[#1a1f2e] border border-[#2a3040]"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded bg-[#1a1f2e] border border-[#2a3040]"
          >
            Minimize
          </button>
        </div>
      </div>

      {/* Holdings list */}
      {holdings.length > 0 ? (
        <div className="space-y-2 mb-4">
          {holdings.map((h, i) => {
            const p = getPrice(h.symbol)
            const usdValue = p ? p.usd * h.amount : null
            const change = p?.usd_24h_change
            return (
              <div key={i} className="flex items-center justify-between bg-[#0d1420] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                    {h.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{h.symbol}</p>
                    <p className="text-xs text-slate-500">{h.amount.toLocaleString()} coins</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {p ? (
                      <>
                        <p className="text-sm font-semibold text-white">
                          ${usdValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">
                          @${p.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {change !== undefined && (
                            <span className={change >= 0 ? 'text-emerald-400 ml-1' : 'text-red-400 ml-1'}>
                              {change >= 0 ? '▲' : '▼'}{Math.abs(change).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-600">loading…</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeHolding(h)}
                    className="text-slate-700 hover:text-red-400 text-xs transition-colors"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-600 text-sm mb-4">
          Add your crypto holdings to track their value in real time.
        </div>
      )}

      {/* Add holding */}
      <div className="border-t border-[#1f2937] pt-4">
        <p className="text-xs text-slate-500 mb-2">Add holding</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Symbol (BTC, ETH…)"
              value={addSymbol}
              onChange={e => setAddSymbol(e.target.value.toUpperCase())}
              className="w-full bg-[#0d1420] border border-[#2a3040] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 uppercase"
              list="crypto-list"
            />
            <datalist id="crypto-list">
              {POPULAR.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <input
            type="number"
            placeholder="Amount"
            value={addAmount}
            onChange={e => setAddAmount(e.target.value)}
            min="0"
            step="any"
            className="w-32 bg-[#0d1420] border border-[#2a3040] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={addHolding}
            disabled={saving || !addSymbol || !addAmount}
            className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {saving ? '…' : '+ Add'}
          </button>
        </div>

        {/* Popular coins quick-add */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {POPULAR.slice(0, 7).map(s => (
            <button
              key={s}
              onClick={() => setAddSymbol(s)}
              className={`text-xs px-2 py-1 rounded-full border transition-all ${
                addSymbol === s
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                  : 'bg-[#0d1420] border-[#2a3040] text-slate-500 hover:border-purple-500/30 hover:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {flash && (
          <div className="mt-3 text-sm text-center py-2 bg-[#0a1628] rounded-lg border border-purple-500/20 text-purple-400">
            {flash}
          </div>
        )}
      </div>
    </div>
  )
}
