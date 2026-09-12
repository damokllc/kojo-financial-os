'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INCOME_CATEGORIES = ['Salary', 'Business Revenue', 'Freelance', 'Investment', 'Rental', 'Grant', 'Other Income']
const EXPENSE_CATEGORIES = ['Rent/Mortgage', 'Food', 'Transport', 'Utilities', 'Business Expense', 'Debt Payment', 'Subscriptions', 'Healthcare', 'Entertainment', 'Other']

export default function QuickAdd({ accounts }: { accounts: { id: string; name: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [form, setForm] = useState({ description: '', amount: '', category: '', accountId: '', date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  async function submit() {
    if (!form.description || !form.amount) return
    setSaving(true)
    const amount = parseFloat(form.amount) * (type === 'expense' ? -1 : 1)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          amount,
          category: form.category || undefined,
          accountId: form.accountId || undefined,
          date: form.date || undefined,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setFlash(`✅ ${type === 'income' ? 'Income' : 'Expense'} of $${Math.abs(amount).toLocaleString()} recorded!`)
      setForm({ description: '', amount: '', category: '', accountId: '', date: '', notes: '' })
      setTimeout(() => { setFlash(null); setOpen(false) }, 2000)
      router.refresh()
    } catch {
      setFlash('⚠️ Failed to save. Try again.')
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-6">
      {!open ? (
        <div className="flex gap-3">
          <button
            onClick={() => { setType('income'); setOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/20 transition-all"
          >
            <span className="text-lg">↗</span> Log Income
          </button>
          <button
            onClick={() => { setType('expense'); setOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all"
          >
            <span className="text-lg">↙</span> Log Expense
          </button>
        </div>
      ) : (
        <div className={`bg-[#111827] border rounded-2xl p-5 ${type === 'income' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          {/* Type toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#1a1f2e] text-slate-500 border border-transparent hover:border-slate-600'}`}
            >
              ↗ Income
            </button>
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${type === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-[#1a1f2e] text-slate-500 border border-transparent hover:border-slate-600'}`}
            >
              ↙ Expense
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Description */}
            <div className="col-span-2">
              <input
                type="text"
                placeholder="Description (e.g. Client payment, Rent, Groceries)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-[#1a1f2e] border border-[#2a3040] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#00e5b0]"
              />
            </div>

            {/* Amount */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="number"
                placeholder="Amount"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                min="0"
                step="0.01"
                className="w-full bg-[#1a1f2e] border border-[#2a3040] rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#00e5b0]"
              />
            </div>

            {/* Date */}
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#00e5b0]"
            />

            {/* Category */}
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#00e5b0]"
            >
              <option value="">Category (optional)</option>
              {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Account */}
            {accounts.length > 0 && (
              <select
                value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#00e5b0]"
              >
                <option value="">Account (optional)</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Flash message */}
          {flash && (
            <div className="mt-3 text-sm text-center py-2 bg-[#0a1628] rounded-lg border border-[#00e5b0]/20 text-[#00e5b0]">
              {flash}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={submit}
              disabled={saving || !form.description || !form.amount}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                type === 'income'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {saving ? 'Saving…' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 bg-[#1a1f2e] border border-[#2a3040] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
