import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

function fmt(n: number) {
  return n >= 0 ? `+$${n.toLocaleString()}` : `-$${Math.abs(n).toLocaleString()}`
}

export default async function CashFlowCard() {
  const session = await auth()
  const userId = session!.user!.id!

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const txns = await db.transaction.findMany({
    where: { userId, date: { gte: startOfMonth }, isExcluded: false },
    select: { amount: true, type: true },
  })

  const income = txns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expenses = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const net = income - expenses

  return (
    <div className="card">
      <p className="metric-label">Monthly Cash Flow</p>
      <p className={`metric-value mt-1 ${net >= 0 ? 'text-[#00e5b0]' : 'text-red-400'}`}>
        {fmt(net)}
      </p>
      <div className="flex gap-4 mt-3 pt-3 border-t border-[#2a3040]">
        <div>
          <p className="text-xs text-slate-500">In</p>
          <p className="text-sm font-semibold text-green-400">${income.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Out</p>
          <p className="text-sm font-semibold text-red-400">${expenses.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
