import { auth } from '@/lib/auth'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getFinancialContext } from '@/lib/ai/context'
import { sql } from '@/lib/db/neon'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Tool definitions ────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_web',
    description: `Search the internet for current, real-world information relevant to Kojo's financial situation.
Use this to find: government grants, SBA loans, business grants, income opportunities, public business records,
Ghana/US financial news, market rates, tax credits, housing programs, startup funding, and any other
opportunities that could improve Kojo's financial position. Search proactively when topics come up.`,
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Specific search query. Be precise.' },
        focus: { type: 'string', enum: ['grants', 'income', 'business', 'credit', 'ghana', 'news', 'general'] }
      },
      required: ['query']
    }
  },
  {
    name: 'search_grants',
    description: 'Specifically search for grants, government benefits, and financial assistance programs that Kojo may qualify for.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['small_business', 'minority_business', 'ghana_diaspora', 'startup', 'housing', 'education', 'general'] },
        keywords: { type: 'string' }
      },
      required: ['category']
    }
  },
  {
    name: 'save_data',
    description: `Save financial data to Kojo's database. Use this whenever Kojo tells you about a financial account, debt, business, goal, or open loop — capture it immediately so the system stays updated and accurate. Always confirm what you saved.

Entity types and required fields:
- account: name (string), type (CHECKING|SAVINGS|INVESTMENT|BUSINESS|CRYPTO|REAL_ESTATE|RETIREMENT|OTHER), balance (number), institution (optional), currency (optional, default USD)
- debt: creditor (string), type (CREDIT_CARD|AUTO_LOAN|MORTGAGE|STUDENT_LOAN|PERSONAL_LOAN|BUSINESS_LOAN|MEDICAL|COLLECTION|OTHER), currentBalance (number), apr (optional), minimumPayment (optional), status (CURRENT|LATE_30|LATE_60|LATE_90|COLLECTION|CHARGED_OFF|DISPUTED|PAID, default CURRENT)
- business: name (string), grade (A|B|C|D|E|F|G, default C), monthlyRevenue (number), monthlyExpenses (number), type (optional), description (optional), country (optional)
- goal: title (string), category (SAVINGS|DEBT_PAYOFF|INCOME|INVESTMENT|BUSINESS|CREDIT|EMERGENCY_FUND|OTHER), targetAmount (optional), currentAmount (optional, default 0), targetDate (optional ISO date), priority (LOW|MEDIUM|HIGH|CRITICAL)
- loop: text (string), priority (LOW|MEDIUM|HIGH|CRITICAL), nextAction (optional), dueDate (optional ISO date), category (optional)
- profile: any subset of: preferredName, legalName, phone, city, state, country, primaryCurrency, ghanaOps (boolean), riskTolerance (conservative|moderate|aggressive), financialGoal, northStar`,
    input_schema: {
      type: 'object',
      properties: {
        entity: { type: 'string', enum: ['account', 'debt', 'business', 'goal', 'loop', 'profile'] },
        data: { type: 'object', description: 'The fields to save for this entity' }
      },
      required: ['entity', 'data']
    }
  }
]

// ── Web search ──────────────────────────────────────────────────────────────
async function searchWeb(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    const ddg = await res.json()
    const parts: string[] = [`[Web Search: "${query}"]`]
    if (ddg.AbstractText) parts.push(`Summary: ${ddg.AbstractText}`)
    if (ddg.Answer) parts.push(`Direct Answer: ${ddg.Answer}`)
    if (ddg.RelatedTopics?.length) {
      const topics = (ddg.RelatedTopics as any[]).filter(t => t.Text && !t.Topics).slice(0, 6)
        .map(t => `• ${t.Text}${t.FirstURL ? '\n  ' + t.FirstURL : ''}`)
      if (topics.length) parts.push(`Related:\n${topics.join('\n')}`)
    }
    if (ddg.Results?.length) {
      const results = (ddg.Results as any[]).slice(0, 4).map((r: any) => `• ${r.Text}: ${r.FirstURL}`)
      parts.push(`Top Results:\n${results.join('\n')}`)
    }
    const out = parts.join('\n\n')
    return out.length < 80 ? `Limited results for "${query}". Check: grants.gov, sba.gov, usa.gov, gipcghana.com` : out
  } catch (err: any) {
    return `Search unavailable: ${err.message}. Check: grants.gov | sba.gov | gipcghana.com`
  }
}

async function searchGrants(category: string, keywords?: string): Promise<string> {
  const queryMap: Record<string, string> = {
    small_business: 'small business grants 2026 USA government',
    minority_business: 'minority owned business grants 2026 Black entrepreneur funding',
    ghana_diaspora: 'Ghana diaspora investment grants business 2026',
    startup: 'startup grants funding 2026 entrepreneur United States',
    housing: 'government housing assistance grants 2026',
    education: 'education grants financial assistance 2026',
    general: 'government grants individuals entrepreneurs 2026',
  }
  return searchWeb(`${queryMap[category] || 'business grants 2026'} ${keywords || ''}`)
}

// ── Save data to DB ──────────────────────────────────────────────────────────
async function saveData(userId: string, entity: string, data: Record<string, any>): Promise<string> {
  try {
    const id = crypto.randomUUID()

    if (entity === 'account') {
      const { name, type, balance = 0, institution, currency = 'USD', notes } = data
      if (!name || !type) return 'Error: account requires name and type'
      await sql`
        INSERT INTO "FinancialAccount" (id, "userId", name, type, institution, balance, currency, notes, "isActive", "dataStatus", "createdAt", "updatedAt")
        VALUES (${id}, ${userId}, ${name}, ${type}, ${institution ?? null}, ${Number(balance)}, ${currency}, ${notes ?? null}, true, 'USER_PROVIDED', NOW(), NOW())
      `
      return `✅ Saved account: ${name} (${type}) — Balance: $${Number(balance).toLocaleString()}`
    }

    if (entity === 'debt') {
      const { creditor, type, currentBalance, apr, minimumPayment, status = 'CURRENT', notes } = data
      if (!creditor || !type || currentBalance === undefined) return 'Error: debt requires creditor, type, currentBalance'
      await sql`
        INSERT INTO "Debt" (id, "userId", creditor, type, "originalBalance", "currentBalance", apr, "minimumPayment", status, notes, "dataStatus", "createdAt", "updatedAt")
        VALUES (${id}, ${userId}, ${creditor}, ${type}, ${Number(currentBalance)}, ${Number(currentBalance)},
          ${apr != null ? Number(apr) : null}, ${minimumPayment != null ? Number(minimumPayment) : null},
          ${status}, ${notes ?? null}, 'USER_PROVIDED', NOW(), NOW())
      `
      return `✅ Saved debt: ${creditor} — $${Number(currentBalance).toLocaleString()} ${apr ? `@ ${apr}% APR` : ''}`
    }

    if (entity === 'business') {
      const { name, grade = 'C', monthlyRevenue = 0, monthlyExpenses = 0, type, description, country = 'US', website, notes } = data
      if (!name) return 'Error: business requires name'
      const profit = Number(monthlyRevenue) - Number(monthlyExpenses)
      const isGhana = (data.country ?? '').toLowerCase().includes('ghana') || (data.country ?? '').toLowerCase() === 'gh'
      await sql`
        INSERT INTO "Business" (id, "userId", name, "entityType", description, grade, "monthlyRevenue", "monthlyExpenses", "monthlyProfit", "isGhana", notes, "isActive", "dataStatus", "createdAt", "updatedAt")
        VALUES (${id}, ${userId}, ${name}, ${type ?? null}, ${description ?? null}, ${grade},
          ${Number(monthlyRevenue)}, ${Number(monthlyExpenses)}, ${profit},
          ${isGhana}, ${notes ?? null}, true, 'USER_PROVIDED', NOW(), NOW())
      `
      return `✅ Saved business: ${name} (Grade ${grade}) — Revenue: $${Number(monthlyRevenue).toLocaleString()}/mo, Profit: $${profit.toLocaleString()}/mo`
    }

    if (entity === 'goal') {
      const { title, category = 'OTHER', targetAmount, currentAmount = 0, targetDate, priority = 'MEDIUM', description } = data
      if (!title) return 'Error: goal requires title'
      await sql`
        INSERT INTO "Goal" (id, "userId", title, notes, category, "targetAmount", "currentAmount", "targetDate", priority, status, "createdAt", "updatedAt")
        VALUES (${id}, ${userId}, ${title}, ${description ?? null}, ${category},
          ${targetAmount != null ? Number(targetAmount) : null}, ${Number(currentAmount)},
          ${targetDate ? new Date(targetDate).toISOString() : null}, ${priority}, 'active', NOW(), NOW())
      `
      return `✅ Saved goal: "${title}" ${targetAmount ? `— Target: $${Number(targetAmount).toLocaleString()}` : ''} ${targetDate ? `| Due: ${new Date(targetDate).toLocaleDateString()}` : ''}`
    }

    if (entity === 'loop') {
      const { text, priority = 'MEDIUM', nextAction, dueDate, category } = data
      if (!text) return 'Error: loop requires text'
      await sql`
        INSERT INTO "OpenLoop" (id, "userId", text, priority, "nextAction", "dueDate", category, status, "createdAt", "updatedAt")
        VALUES (${id}, ${userId}, ${text}, ${priority}, ${nextAction ?? null},
          ${dueDate ? new Date(dueDate).toISOString() : null}, ${category ?? null}, 'PENDING', NOW(), NOW())
      `
      return `✅ Saved open loop: [${priority}] "${text}"${nextAction ? ` → Next: ${nextAction}` : ''}`
    }

    if (entity === 'profile') {
      const existing = await sql`SELECT id FROM "Profile" WHERE "userId" = ${userId} LIMIT 1`
      const allowed = ['preferredName','legalName','altName','phone','city','state','country','primaryCurrency','ghanaOps','riskTolerance','financialGoal','northStar']
      const clean = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)))
      if (Object.keys(clean).length === 0) return 'No valid profile fields provided'

      if (existing.length === 0) {
        await sql`
          INSERT INTO "Profile" (id, "userId", "preferredName", "legalName", phone, city, state, country, "primaryCurrency", "ghanaOps", "riskTolerance", "financialGoal", "northStar", "createdAt", "updatedAt")
          VALUES (${id}, ${userId}, ${clean.preferredName ?? null}, ${clean.legalName ?? null}, ${clean.phone ?? null},
            ${clean.city ?? null}, ${clean.state ?? null}, ${clean.country ?? 'US'}, ${clean.primaryCurrency ?? 'USD'},
            ${clean.ghanaOps ?? false}, ${clean.riskTolerance ?? 'moderate'}, ${clean.financialGoal ?? null}, ${clean.northStar ?? null},
            NOW(), NOW())
        `
      } else {
        await sql`
          UPDATE "Profile" SET
            "preferredName"   = COALESCE(${clean.preferredName ?? null}, "preferredName"),
            "legalName"       = COALESCE(${clean.legalName ?? null}, "legalName"),
            "altName"         = COALESCE(${clean.altName ?? null}, "altName"),
            phone             = COALESCE(${clean.phone ?? null}, phone),
            city              = COALESCE(${clean.city ?? null}, city),
            state             = COALESCE(${clean.state ?? null}, state),
            country           = COALESCE(${clean.country ?? null}, country),
            "primaryCurrency" = COALESCE(${clean.primaryCurrency ?? null}, "primaryCurrency"),
            "ghanaOps"        = COALESCE(${clean.ghanaOps ?? null}, "ghanaOps"),
            "riskTolerance"   = COALESCE(${clean.riskTolerance ?? null}, "riskTolerance"),
            "financialGoal"   = COALESCE(${clean.financialGoal ?? null}, "financialGoal"),
            "northStar"       = COALESCE(${clean.northStar ?? null}, "northStar"),
            "updatedAt"       = NOW()
          WHERE "userId" = ${userId}
        `
      }
      return `✅ Profile updated: ${Object.keys(clean).join(', ')}`
    }

    return `Unknown entity: ${entity}`
  } catch (err: any) {
    console.error('[save_data] error:', err.message)
    return `Error saving ${entity}: ${err.message}`
  }
}

async function executeTool(name: string, input: Record<string, any>, userId: string): Promise<string> {
  if (name === 'search_web') return searchWeb(input.query)
  if (name === 'search_grants') return searchGrants(input.category, input.keywords)
  if (name === 'save_data') return saveData(userId, input.entity, input.data)
  return 'Unknown tool'
}

// ── Request schema ───────────────────────────────────────────────────────────
const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(10_000),
  })).min(1).max(50),
  conversationId: z.string().optional(),
})

// ── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = session.user.id

  let body: z.infer<typeof bodySchema>
  try { body = bodySchema.parse(await req.json()) } catch {
    return new Response('Invalid request', { status: 400 })
  }

  const systemPrompt = await getFinancialContext(userId)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''

      function send(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        const anthropicMessages = body.messages as Anthropic.MessageParam[]

        // Phase 1: Initial call — may trigger tools
        let currentMessages = [...anthropicMessages]
        let continueLoop = true
        let loopCount = 0
        const MAX_LOOPS = 4

        while (continueLoop && loopCount < MAX_LOOPS) {
          loopCount++
          const msg = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOLS,
          })

          const textBlocks = msg.content.filter(b => b.type === 'text')
          const toolUseBlocks = msg.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]

          // Stream any text in this turn
          for (const block of textBlocks) {
            if (block.type === 'text' && block.text.trim()) {
              // Chunk text for streaming effect
              if (msg.stop_reason !== 'tool_use') {
                const words = block.text.split(' ')
                for (let i = 0; i < words.length; i += 4) {
                  const chunk = words.slice(i, i + 4).join(' ') + (i + 4 < words.length ? ' ' : '')
                  fullText += chunk
                  send({ text: chunk })
                  await new Promise(r => setTimeout(r, 5))
                }
              } else {
                fullText += block.text
                send({ text: block.text })
              }
            }
          }

          if (msg.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
            continueLoop = false
            break
          }

          // Handle tools
          const searchTools = toolUseBlocks.filter(t => t.name !== 'save_data')
          const saveTools = toolUseBlocks.filter(t => t.name === 'save_data')

          if (searchTools.length > 0) {
            const q = (searchTools[0].input as any).query || 'searching...'
            send({ status: 'searching', query: q })
          }
          if (saveTools.length > 0) {
            send({ status: 'saving', entity: (saveTools[0].input as any).entity })
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (toolUse) => ({
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: await executeTool(toolUse.name, toolUse.input as Record<string, any>, userId),
            }))
          )

          send({ status: 'responding' })

          // Append assistant turn + tool results, loop for follow-up
          currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: msg.content },
            { role: 'user' as const, content: toolResults },
          ]
        }

        // If last turn was tool use, stream the final response
        if (loopCount > 1 && fullText === '') {
          // Already streamed inline above in the loop
        }

        // Save conversation (fire & forget)
        if (body.conversationId && fullText) {
          const lastUserMsg = body.messages[body.messages.length - 1]
          sql`
            INSERT INTO "ConversationMessage" (id, "conversationId", role, content, "createdAt")
            VALUES
              (${crypto.randomUUID()}, ${body.conversationId}, 'user', ${lastUserMsg.content}, NOW()),
              (${crypto.randomUUID()}, ${body.conversationId}, 'assistant', ${fullText}, NOW())
          `.catch((err: Error) => console.error('[chat] save error:', err.message))
        }

        send({ done: true })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        console.error('AI stream error:', err)
        send({ error: 'AI error — please try again.' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
