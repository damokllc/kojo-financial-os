import { auth } from '@/lib/auth'
import { sql } from '@/lib/db/neon'

function fmt(n: number) {
  return n >= 0 ? `+$${n.toLocaleString()}` : `-$${Math.abs(n).toLocaleString()}`
}

export default async function CashFlowCard() {
  const session = await auth()
  const userId = session!.user!.id!

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let income = 0
  let expenses = 0

  try {
    // positive amount = income/credit, negative = expense/debit (per schema)
    const rows = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS expenses
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND date >= ${startOfMonth}
    `
    if (rows[0]) {
      income = Number(rows[0].income)
      expenses = Number(rows[0].expenses)
    }
  } catch {
    // DB unavailable — show zeros gracefully
  }

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
