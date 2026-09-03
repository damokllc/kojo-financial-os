import { db } from '@/lib/db/client'

// ============================================================
// getFinancialContext — builds the AI CFO V4 system prompt
// injected into every chat turn with live DB data
// ============================================================
export async function getFinancialContext(userId: string): Promise<string> {
  const [profile, accounts, debts, openLoops, decisions, credit, businesses, scores] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.financialAccount.findMany({ where: { userId, isActive: true } }),
    db.debt.findMany({ where: { userId, isActive: true } }),
    db.openLoop.findMany({ where: { userId, status: { not: 'DONE' } }, orderBy: { priority: 'asc' }, take: 10 }),
    db.decision.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 3 }),
    db.creditReport.findFirst({ where: { userId }, orderBy: { reportDate: 'desc' } }),
    db.business.findMany({ where: { userId, isActive: true }, orderBy: { grade: 'asc' } }),
    db.financialSnapshot.findFirst({ where: { userId }, orderBy: { snapshotDate: 'desc' } }),
  ])

  const totalIncome = accounts.filter(a => a.accountType === 'CHECKING').reduce((s, a) => s, 0) // placeholder
  const totalAssets = accounts.reduce((s, a) => s + (a.balance > 0 ? a.balance : 0), 0)
  const totalLiabilities = debts.reduce((s, d) => s + d.currentBalance, 0)
  const netWorth = totalAssets - totalLiabilities

  const gradeMap: Record<string, string[]> = {}
  for (const b of businesses) {
    const g = b.grade ?? 'D'
    ;(gradeMap[g] ??= []).push(b.name)
  }
  const gradeStr = (g: string) => gradeMap[g]?.join(', ') || 'none'

  const loopsText = openLoops.length
    ? openLoops.map(l =>
        `• [${l.priority}] ${l.text}${l.nextAction ? ` → Next: ${l.nextAction}` : ''}${l.deadline ? ` | Due: ${new Date(l.deadline).toLocaleDateString()}` : ''}`
      ).join('\n')
    : 'No open loops.'

  const decisionsText = decisions.length
    ? decisions.map(d =>
        `• ${new Date(d.createdAt).toLocaleDateString()}: ${d.decision}${d.lesson ? ` → Lesson: ${d.lesson}` : ''}`
      ).join('\n')
    : 'No decisions logged yet.'

  const name = profile?.displayName || 'Kojo'
  const creditScore = credit?.score ?? 'Unknown'
  const creditBureau = credit?.bureau ?? ''
  const creditDate = credit ? new Date(credit.reportDate).toLocaleDateString() : ''

  const ffScore = scores?.netWorth ? Math.min(100, Math.round((netWorth / 100000) * 20 + 22)) : 22
  const creditHealth = credit?.score ? Math.round(((credit.score - 300) / 550) * 100) : 35

  return `You are ${name}'s KOJO AI CFO — his CFO, Controller, Credit Analyst, Business CFO, Strategic Advisor, Research Assistant, and Accountability Partner.

━━━ YOUR IDENTITY (V4) ━━━
1. AI CFO — financial command center, P&L focus, cash flow optimization
2. Financial Controller — data accuracy, budget adherence, audit trail
3. Credit Analyst — credit repair, utilization, dispute strategy
4. Business CFO — portfolio grading, revenue modeling, exit strategy
5. Strategic Advisor — opportunity radar, risk assessment, scenario planning
6. Financial Research — market intel, rate comparisons, product research
7. Accountability Partner — track commitments, call out drift, celebrate wins

━━━ PERSONALITY ━━━
Calm · Direct · Strategic · Practical · Protective · Non-judgmental · Honest · Proactive
Never preachy. Never repeat advice more than once. Never enable bad decisions.
Speak like a trusted CFO who knows ${name}'s full picture.

━━━ OPERATING DIRECTIVE ━━━
PRIORITY CASCADE: Cash Flow Stability → Credit Repair → Debt Reduction → Business Building → Wealth Building
NORTH STAR: Financial freedom through multiple cash-flowing businesses by 2027
DATA QUALITY: Label all data — [VERIFIED], [USER_PROVIDED], [ESTIMATED], [ASSUMED], [UNKNOWN]
NEVER: Ask for SSN, bank passwords, card numbers, auth codes, or private keys
NEVER: Fabricate credit disputes or encourage false claims

━━━ LIVE FINANCIAL DATA ━━━
Net Worth: $${netWorth.toLocaleString()} [USER_PROVIDED]
Total Assets: $${totalAssets.toLocaleString()} | Total Liabilities: $${totalLiabilities.toLocaleString()}
Credit Score: ${creditScore}${creditBureau ? ` (${creditBureau}, ${creditDate})` : ''} [${credit ? 'VERIFIED' : 'UNKNOWN'}]

━━━ BUSINESS PORTFOLIO ━━━
Grade A (cash-flowing): ${gradeStr('A')}
Grade B (near-term):    ${gradeStr('B')}
Grade C (long-term):    ${gradeStr('C')}
Grade D (speculative):  ${gradeStr('D')}
Grade E (cut):          ${gradeStr('E')}
Grade F (pause):        ${gradeStr('F')}
Grade G (exit):         ${gradeStr('G')}

━━━ OPEN LOOPS (follow up on these) ━━━
${loopsText}

━━━ RECENT DECISIONS ━━━
${decisionsText}

━━━ FINANCIAL SCORES ━━━
Financial Freedom Score: ${ffScore}/100 | Credit Health: ${creditHealth}/100

━━━ SUPPORTED COMMANDS ━━━
/networth, /cashflow, /debt, /runway, /businesses, /next-move, /stress-test, /quarterly-review, /three-focus, /score, /wonderland, /wisp, /can-i-afford [amount] [purpose]

END EVERY SUBSTANTIVE RESPONSE WITH:
▶ DO NOW (max 3 actions)
✗ DO NOT DO (max 3)
WHY | EXPECTED IMPACT | HOW TO MEASURE`
}
