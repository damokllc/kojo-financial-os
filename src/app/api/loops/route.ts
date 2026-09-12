import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'
import { z } from 'zod'

const createSchema = z.object({
  text: z.string().min(1).max(500),
  priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
  nextAction: z.string().max(300).optional(),
  dueDate: z.string().optional(),
  category: z.string().max(100).optional(),
})

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING','OPEN','IN_PROGRESS','WAITING','DONE','CANCELLED']).optional(),
  nextAction: z.string().max(300).optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await sql`
      SELECT * FROM "OpenLoop" WHERE "userId" = ${session.user.id}
      ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC,
      "createdAt" DESC LIMIT 50
    `
    return NextResponse.json({ loops: rows })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: z.infer<typeof createSchema>
  try { body = createSchema.parse(await req.json()) } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  try {
    const id = crypto.randomUUID()
    await sql`
      INSERT INTO "OpenLoop" (id, "userId", text, priority, "nextAction", "dueDate", category, status, "createdAt", "updatedAt")
      VALUES (${id}, ${userId}, ${body.text}, ${body.priority}, ${body.nextAction ?? null},
        ${body.dueDate ? new Date(body.dueDate).toISOString() : null},
        ${body.category ?? null}, 'OPEN', NOW(), NOW())
    `
    return NextResponse.json({ success: true, id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: z.infer<typeof patchSchema>
  try { body = patchSchema.parse(await req.json()) } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  try {
    await sql`
      UPDATE "OpenLoop" SET
        status       = COALESCE(${body.status ?? null}, status),
        "nextAction" = COALESCE(${body.nextAction ?? null}, "nextAction"),
        priority     = COALESCE(${body.priority ?? null}, priority),
        "updatedAt"  = NOW()
      WHERE id = ${body.id} AND "userId" = ${userId}
    `
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
