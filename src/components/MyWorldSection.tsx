'use client'
import { useState, useEffect } from 'react'

export default function MyWorldSection() {
  const [context, setContext] = useState('')
  const [saved, setSaved] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/profile/context')
      .then(r => r.json())
      .then(d => { setContext(d.context ?? ''); setSaved(d.context ?? '') })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setStatus('saving')
    try {
      const res = await fetch('/api/profile/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })
      if (!res.ok) throw new Error()
      setSaved(context)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const isDirty = context !== saved

  const placeholder = `Describe your full world so Axiom always has context. For example:

I'm Kojo Oppon Kusi (also known as Daey Wonda / Jay Wonda). I run 6 projects:
1. Axiom — my personal financial OS (this app). Built with Next.js + Neon.
2. FX Trading Bot — automated forex trading on my forex.com account. Goal: $500+/mo passive.
3. Gomoa Wonderland WISP — building a Wireless ISP for Gomoa district, Ghana using Starlink backhaul.
4. Network Setup Service — offering home and small-biz network installs locally for $200–500/job.
5. Meba World — YouTube Shorts brand. Posting motivational/faith content under "Daey Wonda" / "Jay Wonda".
6. Shopify Store — dropshipping or digital products. Still in early growth phase.

My north star: financial freedom through cash-flowing businesses by 2027. US + Ghana dual economy.
Operating entity: damokllc (email). Unclaimed brands: 1405 Entertainment, Wonda Media.`

  return (
    <div className="bg-[#0a0f1a] border border-[#1f2937] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0d1420] border-b border-[#1f2937]">
        <div className="flex items-center gap-2">
          <span>🌍</span>
          <h2 className="text-sm font-semibold text-slate-300">My World</h2>
        </div>
        <span className="text-xs text-slate-600">Injected into every Axiom conversation</span>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        <p className="text-xs text-slate-500">
          Write everything Axiom should always know about you — projects, goals, businesses, context, aliases. 
          This gets prepended to every AI conversation automatically.
        </p>

        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder={placeholder}
          rows={12}
          className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-700 resize-y focus:outline-none focus:border-[#00e5b0]/40 transition-colors font-mono leading-relaxed"
          style={{ minHeight: '220px' }}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">{context.length.toLocaleString()} / 50,000 chars</span>
          <button
            onClick={handleSave}
            disabled={!isDirty || status === 'saving'}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              status === 'saved'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : status === 'error'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : isDirty
                ? 'bg-[#00e5b0]/10 text-[#00e5b0] border border-[#00e5b0]/30 hover:bg-[#00e5b0]/20'
                : 'bg-[#111827] text-slate-600 border border-[#1f2937] cursor-not-allowed'
            }`}
          >
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✅ Saved' : status === 'error' ? '❌ Error' : 'Save Context'}
          </button>
        </div>
      </div>
    </div>
  )
}
