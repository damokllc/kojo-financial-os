import { auth } from '@/lib/auth'
import { sql } from '@/lib/db/neon'
import { NextRequest } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = session.user.id

  const rows = await sql`
    SELECT value FROM "Memory"
    WHERE "userId" = ${userId} AND category = 'PERSONAL' AND key = 'userWorld'
    LIMIT 1
  `
  return Response.json({ context: (rows[0] as any)?.value ?? '' })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = session.user.id

  const { context } = await req.json()
  if (typeof context !== 'string') return new Response('Invalid body', { status: 400 })
  const trimmed = context.trim().slice(0, 50000) // cap at 50k chars

  await sql`
    INSERT INTO "Memory" (id, "userId", category, key, value, confidence, "createdAt", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${userId}, 'PERSONAL', 'userWorld', ${trimmed}, 'USER_PROVIDED', NOW(), NOW())
    ON CONFLICT ("userId", category, key)
    DO UPDATE SET value = ${trimmed}, "updatedAt" = NOW()
  `
  return Response.json({ ok: true })
}
