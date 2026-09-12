import { auth } from '@/lib/auth'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { sql } from '@/lib/db/neon'
import { getFinancialContext } from '@/lib/ai/context'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = session.user.id

  // Pull all live financial data
  const [accounts, debts, businesses, openLoops, decisions, creditRows, goals] = await Promise.all([
    sql`SELECT * FROM "FinancialAccount" WHERE "userId" = ${userId} AND "isActive" = true`,
    sql`SELECT * FROM "Debt" WHERE "userId" = ${userId} AND status != 'PAID'`,
    sql`SELECT * FROM "Business" WHERE "userId" = ${userId} AND "isActive" = true ORDER BY grade ASC`,
    sql`
      SELECT * FROM "OpenLoop" WHERE "userId" = ${userId} AND status != 'DONE'
      ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC
      LIMIT 20
    `,
    sql`SELECT * FROM "Decision" WHERE "userId" = ${userId} ORDER BY "createdAt" DESC LIMIT 10`,
    sql`SELECT * FROM "CreditReport" WHERE "userId" = ${userId} ORDER BY "reportDate" DESC LIMIT 1`,
    sql`SELECT * FROM "Goal" WHERE "userId" = ${userId} ORDER BY "createdAt" DESC LIMIT 10`.catch(() => []),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credit = (creditRows[0] as any) ?? null
  const totalAssets = accounts.reduce((s: number, a: any) => s + (Number(a.balance) > 0 ? Number(a.balance) : 0), 0)
  const totalLiabilities = debts.reduce((s: number, d: any) => s + Number(d.currentBalance), 0)
  const netWorth = totalAssets - totalLiabilities
  const totalMonthlyRevenue = (businesses as any[]).reduce((s: number, b: any) => s + Number(b.monthlyRevenue || 0), 0)
  const totalMonthlyProfit = (businesses as any[]).reduce((s: number, b: any) => s + Number(b.monthlyProfit || 0), 0)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const weekKey = new Date().toISOString().slice(0, 10)

  const dataSnapshot = `
WEEKLY REVIEW DATA — ${today}

NET WORTH: $${netWorth.toLocaleString()}
Total Assets: $${totalAssets.toLocaleString()} | Total Liabilities: $${totalLiabilities.toLocaleString()}
Credit Score: ${credit?.score ?? 'Unknown'} (${credit?.bureau ?? ''})

ACCOUNTS (${accounts.length}):
${(accounts as any[]).map(a => `• ${a.name} [${a.type}]: $${Number(a.balance).toLocaleString()}`).join('\n') || 'None'}

ACTIVE DEBTS (${debts.length}):
${(debts as any[]).map(d => `• ${d.creditor} [${d.type}]: $${Number(d.currentBalance).toLocaleString()} @ ${d.apr ?? '?'}% APR — Status: ${d.status}`).join('\n') || 'None'}

BUSINESSES (${businesses.length}):
${(businesses as any[]).map((b: any) => `• [${b.grade ?? 'C'}] ${b.name} — Revenue: $${Number(b.monthlyRevenue || 0).toLocaleString()}/mo | Profit: $${Number(b.monthlyProfit || 0).toLocaleString()}/mo | State: ${b.projectState ?? 'ACTIVE'} | Priority: ${b.priority ?? 'P3'}`).join('\n') || 'None'}
Total portfolio: $${totalMonthlyRevenue.toLocaleString()}/mo revenue | $${totalMonthlyProfit.toLocaleString()}/mo profit

OPEN LOOPS (top priority):
${(openLoops as any[]).map(l => `• [${l.priority}] ${l.text}${l.nextAction ? ` → ${l.nextAction}` : ''}${l.dueDate ? ` | Due: ${new Date(l.dueDate).toLocaleDateString()}` : ''}`).join('\n') || 'No open loops'}

RECENT DECISIONS:
${(decisions as any[]).slice(0, 5).map((d: any) => `• ${new Date(d.createdAt).toLocaleDateString()}: ${d.decision}${d.lesson ? ` → ${d.lesson}` : ''}`).join('\n') || 'None logged'}

GOALS:
${(goals as any[]).slice(0, 5).map((g: any) => `• ${g.title} [${g.priority}]: $${Number(g.currentAmount || 0).toLocaleString()} / $${Number(g.targetAmount || 0).toLocaleString()}`).join('\n') || 'None set'}
`

  const systemPrompt = await getFinancialContext(userId)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate this week's AXIOM Weekly Review using the live data below. 

Format it EXACTLY like this — use the section headers and structure. Be specific with numbers. Be direct. No fluff.

Required sections:
1. WEEK IN REVIEW — one sharp sentence on where things stand overall
2. TOP 3 ACTIONS THIS WEEK — the 3 most important things to do RIGHT NOW, ordered by impact. Each action: what to do, why it matters, and a specific next step.
3. PERSONAL FINANCE — net worth trend, credit movement, debt progress, key account changes
4. BUSINESS PORTFOLIO — which businesses moved (up or down), what needs attention, which to double down on
5. OPEN LOOPS AUDIT — critical items overdue or at risk, anything to close this week
6. OPPORTUNITIES SPOTTED — 1-2 specific opportunities (grants, partnerships, moves) worth pursuing this week
7. RISKS TO WATCH — 1-2 real risks that could set back the plan if ignored
8. NORTH STAR CHECK — one honest sentence: is Kojo on track for financial freedom through multiple cash-flowing businesses by 2027?

${dataSnapshot}`
      }
    ]
  })

  const reviewText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Save to Memory table with weekly key
  await sql`
    INSERT INTO "Memory" (id, "userId", category, key, value, confidence, "createdAt", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${userId}, ${'WEEKLY_REVIEW'}, ${weekKey}, ${reviewText}, 'AI_GENERATED', NOW(), NOW())
    ON CONFLICT ("userId", category, key)
    DO UPDATE SET value = ${reviewText}, "updatedAt" = NOW()
  `

  return Response.json({ review: reviewText, date: weekKey, generatedAt: new Date().toISOString() })
}
