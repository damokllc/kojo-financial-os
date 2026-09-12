import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import Link from 'next/link'
import QuickAdd from './QuickAdd'
import FinanceConnect from '@/components/FinanceConnect'
import PlaidStatus from '@/components/PlaidStatus'
import CryptoTracker from '@/components/CryptoTracker'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

const accountTypeLabel: Record<string, string> = {
  CHECKING: 'Checking', SAVINGS: 'Savings', INVESTMENT: 'Investment',
  BUSINESS: 'Business', CRYPTO: 'Crypto', REAL_ESTATE: 'Real Estate',
  RETIREMENT: 'Retirement', CREDIT_CARD: 'Credit Card', MOBILE_MONEY: 'Mobile Money', OTHER: 'Other',
}

const debtTypeLabel: Record<string, string> = {
  CREDIT_CARD: 'Credit Card', AUTO_LOAN: 'Auto Loan', MORTGAGE: 'Mortgage',
  STUDENT_LOAN: 'Student Loan', PERSONAL_LOAN: 'Personal Loan',
  MEDICAL: 'Medical', TAX: 'Tax Debt', OTHER: 'Other',
}

const debtStatusColor: Record<string, string> = {
  CURRENT: 'text-emerald-400', LATE_30: 'text-yellow-400', LATE_60: 'text-orange-400',
  LATE_90: 'text-red-400', COLLECTIONS: 'text-red-500', CHARGED_OFF: 'text-red-600',
  SETTLED: 'text-slate-400', PAID: 'text-emerald-500',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function CashflowPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const userId = session.user.id

  const [accounts, debts, recentTx] = await Promise.all([
    safeQuery(sql`
      SELECT * FROM "FinancialAccount"
      WHERE "userId" = ${userId} AND "isActive" = true
      ORDER BY type ASC, balance DESC
    `),
    safeQuery(sql`
      SELECT * FROM "Debt"
      WHERE "userId" = ${userId} AND status != 'PAID'
      ORDER BY "currentBalance" DESC
    `),
    safeQuery(sql`
      SELECT t.*, fa.name as "accountName"
      FROM "Transaction" t
      LEFT JOIN "FinancialAccount" fa ON t."accountId" = fa.id
      WHERE t."userId" = ${userId}
      ORDER BY t.date DESC
      LIMIT 50
    `),
  ]) as [any[], any[], any[]]

  const totalAssets = accounts.reduce((s, a) => s + (Number(a.balance) > 0 ? Number(a.balance) : 0), 0)
  const totalLiabilities = debts.reduce((s, d) => s + Number(d.currentBalance), 0)
  const netWorth = totalAssets - totalLiabilities
  const totalMinPayments = debts.reduce((s, d) => s + Number(d.minimumPayment || 0), 0)

  const accountsByType: Record<string, any[]> = {}
  for (const a of accounts) {
    const t = a.type || 'OTHER'
    ;(accountsByType[t] ??= []).push(a)
  }

  const accountsForConnect = accounts.map((a: any) => ({ id: a.id, name: a.name, institution: a.institution ?? null }))

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Flow</h1>
          <p className="text-slate-400 text-sm mt-0.5">Assets, liabilities, and money movement</p>
        </div>
        <Link
          href="/ai?q=Analyze my cash flow situation. What are my biggest opportunities to improve?"
          className="px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
        >
          🤖 AI Analysis
        </Link>
      </div>

      {/* Connect your finances bar */}
      <FinanceConnect accounts={accountsForConnect} />
      <PlaidStatus />
      <CryptoTracker savedAccounts={accounts.filter((a: any) => a.type === 'CRYPTO').map((a: any) => ({ id: a.id, name: a.name, institution: a.institution ?? undefined }))} />

      {/* Quick Add Transaction */}
      <QuickAdd accounts={accounts.map((a: any) => ({ id: a.id, name: a.name }))} />

      {/* Net Worth Banner */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#111827] border border-[#1f2937] rounded-2xl p-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Assets</p>
            <p className="text-2xl font-bold text-emerald-400">${fmt(totalAssets)}</p>
          </div>
          <div className="border-x border-[#1f2937]">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Net Worth</p>
            <p className={`text-3xl font-black ${netWorth >= 0 ? 'text-[#00e5b0]' : 'text-red-400'}`}>
              {netWorth < 0 ? '-' : ''}${fmt(Math.abs(netWorth))}
            </p>
            <p className="text-xs text-slate-600 mt-1">[USER_PROVIDED]</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Liabilities</p>
            <p className="text-2xl font-bold text-red-400">${fmt(totalLiabilities)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Accounts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Accounts & Assets</h2>
            {accounts.length === 0 && (
              <Link href="/ai?q=Help me add my financial accounts to the system." className="text-xs text-[#00e5b0] hover:underline">+ Add via Axiom</Link>
            )}
          </div>

          {accounts.length === 0 ? (
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 text-center">
              <p className="text-4xl mb-3">🏦</p>
              <p className="text-slate-400 text-sm">No accounts yet.</p>
              <p className="text-slate-500 text-xs mt-1">Connect a bank above, import a CSV, or add via Axiom Intake.</p>
            </div>
          ) : (
            Object.entries(accountsByType).map(([type, accts]) => (
              <div key={type} className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-[#0d1420] border-b border-[#1f2937]">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {accountTypeLabel[type] || type}
                  </span>
                </div>
                {accts.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{a.name}</p>
                      <div className="flex items-center gap-2">
                        {a.institution && <p className="text-xs text-slate-500">{a.institution}</p>}
                        {a.dataStatus === 'VERIFIED' && <span className="text-xs text-emerald-500">● live</span>}
                        {a.plaidAccId && <span className="text-xs text-slate-600">🏦 Plaid</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${Number(a.balance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${fmt(Math.abs(Number(a.balance)))}
                      </p>
                      {a.currency !== 'USD' && <p className="text-xs text-slate-600">{a.currency}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Debts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Debts & Liabilities</h2>
            {totalMinPayments > 0 && (
              <span className="text-xs text-slate-500">Min/mo: <span className="text-orange-400 font-medium">${fmt(totalMinPayments)}</span></span>
            )}
          </div>

          {debts.length === 0 ? (
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-slate-400 text-sm">No active debts tracked.</p>
              <Link href="/ai?q=Help me track my debts so we can build a payoff strategy." className="mt-3 inline-block px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20">
                Add debts with Axiom →
              </Link>
            </div>
          ) : (
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
              {debts.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{d.creditor}</p>
                      <span className={`text-xs ${debtStatusColor[d.status] || 'text-slate-400'}`}>{d.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500">{debtTypeLabel[d.type] || d.type}</p>
                      {Number(d.apr) > 0 && <p className="text-xs text-slate-600">• {Number(d.apr).toFixed(1)}% APR</p>}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-red-400">${fmt(Number(d.currentBalance))}</p>
                    {Number(d.minimumPayment) > 0 && (
                      <p className="text-xs text-slate-500">Min: ${fmt(Number(d.minimumPayment))}/mo</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {debts.length > 0 && (
            <Link
              href="/ai?q=Build me a debt payoff strategy using avalanche or snowball method based on my current debts."
              className="block text-center px-4 py-3 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-xl text-sm hover:bg-[#00e5b0]/20 transition-all"
            >
              🤖 Get AI Payoff Strategy →
            </Link>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          {recentTx.length > 0 && (
            <Link href="/ai?q=Analyze my recent transactions and categorize my spending patterns." className="text-xs text-[#00e5b0] hover:underline">
              🤖 Analyze
            </Link>
          )}
        </div>
        {recentTx.length === 0 ? (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-slate-400 text-sm">No transactions yet.</p>
            <p className="text-xs text-slate-500 mt-1">Connect a bank via Plaid or import a CSV statement above.</p>
          </div>
        ) : (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
            {recentTx.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{t.description}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                    {t.accountName && <p className="text-xs text-slate-600">• {t.accountName}</p>}
                    {t.category && <p className="text-xs text-slate-600">• {t.category}</p>}
                  </div>
                </div>
                <p className={`text-sm font-semibold ml-4 ${Number(t.amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {Number(t.amount) > 0 ? '+' : ''}${fmt(Math.abs(Number(t.amount)))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
