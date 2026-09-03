import Link from 'next/link'
import type { Business } from '@prisma/client'

const GRADE_COLOR: Record<string, string> = {
  A: '#00e5b0', B: '#3b82f6', C: '#8b5cf6',
  D: '#f59e0b', E: '#ef4444', F: '#6b7280', G: '#374151',
}
const GRADE_DESC: Record<string, string> = {
  A: 'Cash-flowing', B: 'Near-term', C: 'Long-term',
  D: 'Speculative', E: 'Cut', F: 'Pause', G: 'Exit',
}

export default function BusinessGradeWidget({ businesses }: { businesses: Business[] }) {
  const gradeMap = businesses.reduce<Record<string, Business[]>>((acc, b) => {
    const g = b.grade ?? 'D'
    ;(acc[g] ??= []).push(b)
    return acc
  }, {})

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">🏢 Business Portfolio</h2>
        <Link href="/businesses" className="text-xs text-[#00e5b0] hover:underline">
          Manage →
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div>
          <p className="text-slate-500 text-sm mb-3">No businesses tracked yet.</p>
          <Link href="/businesses/new" className="btn-primary text-xs py-2 px-4 inline-block">
            + Add Business
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {['A','B','C','D','E','F','G'].map(grade => {
            const list = gradeMap[grade]
            if (!list?.length) return null
            return (
              <div key={grade} className="flex items-center gap-3">
                <span
                  className="text-xs font-black w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ color: GRADE_COLOR[grade], border: `1.5px solid ${GRADE_COLOR[grade]}33`, background: `${GRADE_COLOR[grade]}11` }}
                >
                  {grade}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">
                    {list.map(b => b.name).join(', ')}
                  </p>
                  <p className="text-xs text-slate-600">{GRADE_DESC[grade]}</p>
                </div>
                <span className="text-xs text-slate-500">{list.length}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
