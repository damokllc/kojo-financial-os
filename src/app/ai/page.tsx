import { Metadata } from 'next'
import AIChatClient from './AIChatClient'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

export const metadata: Metadata = { title: 'AI CFO' }

export default async function AIPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const session = await auth()
  const userId = session!.user!.id!

  // Create or get today's conversation
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let conversation = await db.conversation.findFirst({
    where: { userId, createdAt: { gte: today } },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
  })

  if (!conversation) {
    conversation = await db.conversation.create({
      data: { userId, title: `Session ${new Date().toLocaleDateString()}` },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
  }

  const initialMessages = conversation.messages.map(m => ({
    id: m.id,
    role: m.role.toLowerCase() as 'user' | 'assistant',
    content: m.content,
    timestamp: m.createdAt.toISOString(),
  }))

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">🤖 Kojo AI CFO</h1>
        <p className="text-slate-400 text-sm">Your CFO, Controller, Credit Analyst, and Strategic Advisor in one.</p>
      </div>
      <AIChatClient
        conversationId={conversation.id}
        initialMessages={initialMessages}
        initialPrompt={searchParams.q}
      />
    </div>
  )
}
