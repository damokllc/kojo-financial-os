'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface LoopActionsProps {
  id: string
  status: string
  priority: string
}

export default function LoopActions({ id, status, priority }: LoopActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState<string | null>(null)

  async function update(payload: Record<string, string>) {
    setLoading(Object.keys(payload)[0])
    try {
      await fetch('/api/loops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      startTransition(() => router.refresh())
    } finally {
      setLoading(null)
    }
  }

  const isDone = status === 'DONE' || status === 'CANCELLED'

  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {!isDone && (
        <>
          <button
            onClick={() => update({ status: 'DONE' })}
            disabled={!!loading || isPending}
            className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
          >
            {loading === 'status' ? '...' : '✅ Mark Done'}
          </button>
          {status !== 'IN_PROGRESS' && (
            <button
              onClick={() => update({ status: 'IN_PROGRESS' })}
              disabled={!!loading || isPending}
              className="px-2.5 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
            >
              {loading === 'status' ? '...' : '▶ Start'}
            </button>
          )}
          {priority !== 'CRITICAL' && (
            <button
              onClick={() => update({ priority: 'CRITICAL' })}
              disabled={!!loading || isPending}
              className="px-2.5 py-1 rounded text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600 hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 transition-colors"
            >
              🔴 Escalate
            </button>
          )}
        </>
      )}
    </div>
  )
}
