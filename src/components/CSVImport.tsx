'use client'

import { useState, useRef } from 'react'

interface CSVImportProps {
  accounts: { id: string; name: string; institution: string | null }[]
  onImported?: (count: number) => void
}

export default function CSVImport({ accounts, onImported }: CSVImportProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id ?? '')
  const [preview, setPreview] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('accountId', selectedAccount)
    try {
      const res = await fetch('/api/transactions/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setPreview(data.preview)
      setTotal(data.total)
      setStep('preview')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/transactions/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: preview, accountId: selectedAccount }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setSavedCount(data.saved)
      setStep('done')
      onImported?.(data.saved)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setStep('upload'); setPreview([]); setTotal(0); setError(null) }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
      >
        <span>📄</span> Import CSV
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#141b2d] border border-[#2a3040] rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Import Bank Statement CSV</h2>
          <button onClick={() => { setOpen(false); reset() }} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Apply to account</label>
              <select
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                className="w-full bg-[#1a2236] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">No specific account</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ''}</option>
                ))}
              </select>
            </div>

            <div
              className="border-2 border-dashed border-[#2a3040] rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <div className="text-3xl mb-2">📊</div>
              <p className="text-white text-sm font-medium">Drop your CSV here</p>
              <p className="text-slate-400 text-xs mt-1">Chase, BofA, Wells Fargo, Discover, Amex — any standard bank CSV</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            {loading && <p className="text-slate-400 text-sm text-center">Parsing CSV...</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">Found <span className="text-white font-semibold">{total} transactions</span>. Showing first {preview.length}:</p>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-[#2a3040] divide-y divide-[#1e2a3a]">
              {preview.map((tx, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="text-white text-xs truncate max-w-[260px]">{tx.description}</p>
                    <p className="text-slate-500 text-xs">{tx.date}{tx.category ? ` · ${tx.category}` : ''}</p>
                  </div>
                  <span className={`font-mono text-xs font-semibold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-2 border border-[#2a3040] text-slate-300 rounded-lg text-sm hover:bg-slate-800 transition-colors">
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Saving...' : `Import All ${total}`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold">Imported {savedCount} transactions</p>
            <p className="text-slate-400 text-sm mt-1">Axiom can now analyze your spending patterns.</p>
            <button
              onClick={() => { setOpen(false); reset(); window.location.reload() }}
              className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
