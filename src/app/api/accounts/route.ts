import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['CHECKING','SAVINGS','INVESTMENT','BUSINESS','CRYPTO','REAL_ESTATE','RETIREMENT','OTHER']),
  institution: z.string().max(200).optional(),
  balance: z.number().default(0),
  currency: z.string().max(10).default('USD'),
  accountNumber: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
})

const patchSchema = z.object({
  id: z.string(),
  name: z.string().max(200).optional(),
  balance: z.number().optional(),
  institution: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await sql`SELECT * FROM "FinancialAccount" WHERE "userId" = ${session.user.id} AND "isActive" = true ORDER BY type ASC, balance DESC`
    return NextResponse.json({ accounts: rows })
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
      INSERT INTO "FinancialAccount" (id, "userId", name, type, institution, balance, currency, "accountNumber", notes, "isActive", "dataStatus", "createdAt", "updatedAt")
      VALUES (${id}, ${userId}, ${body.name}, ${body.type}, ${body.institution ?? null},
        ${body.balance}, ${body.currency}, ${body.accountNumber ?? null}, ${body.notes ?? null},
        true, 'USER_PROVIDED', NOW(), NOW())
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
      UPDATE "FinancialAccount" SET
        name        = COALESCE(${body.name ?? null}, name),
        balance     = COALESCE(${body.balance ?? null}, balance),
        institution = COALESCE(${body.institution ?? null}, institution),
        notes       = COALESCE(${body.notes ?? null}, notes),
        "isActive"  = COALESCE(${body.isActive ?? null}, "isActive"),
        "updatedAt" = NOW()
      WHERE id = ${body.id} AND "userId" = ${userId}
    `
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
