import { auth } from '@/lib/auth'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getFinancialContext } from '@/lib/ai/context'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(10_000),
  })).min(1).max(50),
  conversationId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = session.user.id

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return new Response('Invalid request', { status: 400 })
  }

  // Build system prompt with live financial context
  const systemPrompt = await getFinancialContext(userId)

  // Stream response from Anthropic
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''
      try {
        const anthropicStream = await client.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 2048,
          system: systemPrompt,
          messages: body.messages,
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullText += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }

        // Save to conversation history
        if (body.conversationId) {
          const lastUserMsg = body.messages[body.messages.length - 1]
          await db.conversationMessage.createMany({
            data: [
              {
                conversationId: body.conversationId,
                role: 'USER',
                content: lastUserMsg.content,
              },
              {
                conversationId: body.conversationId,
                role: 'ASSISTANT',
                content: fullText,
              },
            ],
          })
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        console.error('AI stream error:', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI error' })}\n\n`))
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
