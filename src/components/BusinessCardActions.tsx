'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const GRADES = ['A','B','C','D','E','F','G']
const PRIORITIES = ['P0','P1','P2','P3','P4']
const STATES = ['ACTIVE','QUEUED','PARKED','ABANDONED']

const gradeDesc: Record<string,string> = { A:'Cash-flowing', B:'Near-term', C:'Long-term', D:'Speculative', E:'Distraction', F:'Pause', G:'Exit' }
const priorityDesc: Record<string,string> = { P0:'Survival', P1:'Cash Gen', P2:'Core', P3:'Strategic', P4:'Experiment' }

export default function BusinessCardActions({
  id, grade, priority, projectState
}: { id: string; grade: string; priority: string; projectState: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  async function patch(payload: Record<string, string>) {
    setLoading(true)
    try {
      await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
      {/* Grade */}
      <select
        value={grade}
        disabled={loading || isPending}
        onChange={e => patch({ grade: e.target.value })}
        className="bg-[#0d1420] border border-[#2a3040] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00e5b0]/40 disabled:opacity-50"
        title="Grade"
      >
        {GRADES.map(g => <option key={g} value={g}>Grade {g} — {gradeDesc[g]}</option>)}
      </select>

      {/* Priority */}
      <select
        value={priority ?? 'P3'}
        disabled={loading || isPending}
        onChange={e => patch({ priority: e.target.value })}
        className="bg-[#0d1420] border border-[#2a3040] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00e5b0]/40 disabled:opacity-50"
        title="Priority"
      >
        {PRIORITIES.map(p => <option key={p} value={p}>{p} — {priorityDesc[p]}</option>)}
      </select>

      {/* State */}
      <select
        value={projectState ?? 'ACTIVE'}
        disabled={loading || isPending}
        onChange={e => patch({ projectState: e.target.value })}
        className="bg-[#0d1420] border border-[#2a3040] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00e5b0]/40 disabled:opacity-50"
        title="Project State"
      >
        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {(loading || isPending) && <span className="text-xs text-slate-500 self-center">Saving…</span>}
    </div>
  )
}
