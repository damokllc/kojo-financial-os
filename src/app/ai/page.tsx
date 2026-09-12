import { Metadata } from 'next'
import AIChatClient from './AIChatClient'
import dynamic from 'next/dynamic'

const DeviceScanner = dynamic(() => import('@/components/axiom/DeviceScanner'), { ssr: false })
import { auth } from '@/lib/auth'
import { sql } from '@/lib/db/neon'

export const metadata: Metadata = { title: 'AI CFO' }

export default async function AIPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const session = await auth()
  const userId = session!.user!.id!

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  let conversationId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let initialMessages: any[] = []

  try {
    // Find today's conversation
    const existing = await sql`
      SELECT id FROM "Conversation"
      WHERE "userId" = ${userId} AND "createdAt" >= ${todayStr}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `

    if (existing[0]) {
      conversationId = existing[0].id as string
      const msgs = await sql`
        SELECT id, role, content, "createdAt"
        FROM "ConversationMessage"
        WHERE "conversationId" = ${conversationId}
        ORDER BY "createdAt" ASC
        LIMIT 50
      `
      initialMessages = msgs.map((m: any) => ({
        id: m.id,
        role: (m.role as string).toLowerCase() as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.createdAt).toISOString(),
      }))
    } else {
      // Create a new conversation
      const newId = crypto.randomUUID()
      const title = `Session ${new Date().toLocaleDateString()}`
      await sql`
        INSERT INTO "Conversation" (id, "userId", title, "createdAt", "updatedAt")
        VALUES (${newId}, ${userId}, ${title}, NOW(), NOW())
      `
      conversationId = newId
    }
  } catch (err) {
    console.error('[ai/page] DB error:', err)
    // Fallback: use a temporary in-memory conversation ID
    conversationId = crypto.randomUUID()
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">🤖 Kojo AI CFO</h1>
        <p className="text-slate-400 text-sm">Your CFO, Controller, Credit Analyst, and Strategic Advisor in one.</p>
      </div>
      <div className="mb-4">
        <DeviceScanner />
      </div>
      <AIChatClient
        conversationId={conversationId}
        initialMessages={initialMessages}
        initialPrompt={searchParams.q}
      />
    </div>
  )
}
