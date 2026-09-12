import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  grade: z.enum(['A','B','C','D','E','F','G']).default('C'),
  monthlyRevenue: z.number().default(0),
  monthlyExpenses: z.number().default(0),
  monthlyProfit: z.number().optional(),
  country: z.string().max(100).optional(),
  website: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  priority: z.enum(['P0','P1','P2','P3','P4']).default('P3'),
  projectState: z.enum(['ACTIVE','QUEUED','PARKED','ABANDONED']).default('ACTIVE'),
})

async function ensureBusinessMigration() {
  try {
    await sql`ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'P3'`
    await sql`ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "projectState" TEXT DEFAULT 'ACTIVE'`
  } catch { /* non-fatal */ }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureBusinessMigration()
  try {
    const rows = await sql`SELECT * FROM "Business" WHERE "userId" = ${session.user.id} AND "isActive" = true ORDER BY grade ASC`
    return NextResponse.json({ businesses: rows })
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

  const profit = body.monthlyProfit ?? (body.monthlyRevenue - body.monthlyExpenses)

  try {
    const id = crypto.randomUUID()
    await sql`
      INSERT INTO "Business" (id, "userId", name, type, description, grade, "monthlyRevenue", "monthlyExpenses", "monthlyProfit", country, website, notes, "isActive", "dataStatus", priority, "projectState", "createdAt", "updatedAt")
      VALUES (${id}, ${userId}, ${body.name}, ${body.type ?? null}, ${body.description ?? null},
        ${body.grade}, ${body.monthlyRevenue}, ${body.monthlyExpenses}, ${profit},
        ${body.country ?? 'US'}, ${body.website ?? null}, ${body.notes ?? null},
        true, 'USER_PROVIDED', ${body.priority}, ${body.projectState}, NOW(), NOW())
    `
    return NextResponse.json({ success: true, id })
  } catch (e: any) {
    console.error('[businesses] post error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

const patchSchema = z.object({
  id: z.string(),
  grade: z.enum(['A','B','C','D','E','F','G']).optional(),
  priority: z.enum(['P0','P1','P2','P3','P4']).optional(),
  projectState: z.enum(['ACTIVE','QUEUED','PARKED','ABANDONED']).optional(),
  monthlyRevenue: z.number().optional(),
  monthlyExpenses: z.number().optional(),
  name: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: z.infer<typeof patchSchema>
  try { body = patchSchema.parse(await req.json()) } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  try {
    const profit = body.monthlyRevenue !== undefined && body.monthlyExpenses !== undefined
      ? body.monthlyRevenue - body.monthlyExpenses
      : undefined

    await sql`
      UPDATE "Business" SET
        grade            = COALESCE(${body.grade ?? null}, grade),
        priority         = COALESCE(${body.priority ?? null}, priority),
        "projectState"   = COALESCE(${body.projectState ?? null}, "projectState"),
        "monthlyRevenue" = COALESCE(${body.monthlyRevenue ?? null}, "monthlyRevenue"),
        "monthlyExpenses"= COALESCE(${body.monthlyExpenses ?? null}, "monthlyExpenses"),
        "monthlyProfit"  = COALESCE(${profit ?? null}, "monthlyProfit"),
        name             = COALESCE(${body.name ?? null}, name),
        notes            = COALESCE(${body.notes ?? null}, notes),
        "isActive"       = COALESCE(${body.isActive ?? null}, "isActive"),
        "updatedAt"      = NOW()
      WHERE id = ${body.id} AND "userId" = ${userId}
    `
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await sql`UPDATE "Business" SET "isActive" = false, "updatedAt" = NOW() WHERE id = ${id} AND "userId" = ${userId}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
