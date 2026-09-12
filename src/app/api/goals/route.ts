import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  category: z.enum(['SAVINGS','DEBT_PAYOFF','INCOME','INVESTMENT','BUSINESS','CREDIT','EMERGENCY_FUND','OTHER']).default('OTHER'),
  targetAmount: z.number().optional(),
  currentAmount: z.number().default(0),
  targetDate: z.string().optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
})

const patchSchema = z.object({
  id: z.string(),
  currentAmount: z.number().optional(),
  status: z.enum(['ACTIVE','COMPLETED','PAUSED','ABANDONED']).optional(),
  title: z.string().max(300).optional(),
  targetDate: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await sql`
      SELECT * FROM "Goal" WHERE "userId" = ${session.user.id}
      ORDER BY
        CASE status WHEN 'ACTIVE' THEN 1 WHEN 'PAUSED' THEN 2 WHEN 'COMPLETED' THEN 3 ELSE 4 END ASC,
        CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC
    `
    return NextResponse.json({ goals: rows })
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
      INSERT INTO "Goal" (id, "userId", title, description, category, "targetAmount", "currentAmount", "targetDate", priority, status, "createdAt", "updatedAt")
      VALUES (${id}, ${userId}, ${body.title}, ${body.description ?? null}, ${body.category},
        ${body.targetAmount ?? null}, ${body.currentAmount},
        ${body.targetDate ? new Date(body.targetDate).toISOString() : null},
        ${body.priority}, 'ACTIVE', NOW(), NOW())
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
      UPDATE "Goal" SET
        "currentAmount" = COALESCE(${body.currentAmount ?? null}, "currentAmount"),
        status          = COALESCE(${body.status ?? null}, status),
        title           = COALESCE(${body.title ?? null}, title),
        "targetDate"    = COALESCE(${body.targetDate ? new Date(body.targetDate).toISOString() : null}, "targetDate"),
        "updatedAt"     = NOW()
      WHERE id = ${body.id} AND "userId" = ${userId}
    `
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
