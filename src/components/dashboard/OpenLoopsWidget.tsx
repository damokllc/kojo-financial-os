import Link from 'next/link'
import type { OpenLoop } from '@prisma/client'

const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: 'badge-red',
  HIGH: 'badge-amber',
  MEDIUM: 'badge-blue',
  LOW: 'text-slate-500 border border-slate-700 rounded px-2 py-0.5 text-xs',
}

export default function OpenLoopsWidget({ loops }: { loops: OpenLoop[] }) {
  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">🔁 Open Loops</h2>
        <Link href="/loops" className="text-xs text-[#00e5b0] hover:underline">
          View all →
        </Link>
      </div>

      {loops.length === 0 ? (
        <p className="text-slate-500 text-sm">All loops closed. Nice work.</p>
      ) : (
        <ul className="space-y-3">
          {loops.map(loop => {
            const overdue = loop.dueDate && new Date(loop.dueDate) < new Date()
            return (
              <li key={loop.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <span className={PRIORITY_STYLE[loop.priority] || PRIORITY_STYLE.MEDIUM}>
                    {loop.priority}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{loop.text}</p>
                  {loop.nextAction && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">→ {loop.nextAction}</p>
                  )}
                </div>
                {loop.dueDate && (
                  <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-400 font-semibold' : 'text-slate-500'}`}>
                    {new Date(loop.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
