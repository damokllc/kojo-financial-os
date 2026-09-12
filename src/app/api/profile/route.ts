import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'
import { z } from 'zod'

const updateSchema = z.object({
  preferredName: z.string().max(100).optional(),
  legalName: z.string().max(200).optional(),
  altName: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  primaryCurrency: z.string().max(10).optional(),
  ghanaOps: z.boolean().optional(),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  financialGoal: z.string().max(500).optional(),
  northStar: z.string().max(500).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await sql`SELECT * FROM "Profile" WHERE "userId" = ${session.user.id} LIMIT 1`
    return NextResponse.json({ profile: rows[0] ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: z.infer<typeof updateSchema>
  try { body = updateSchema.parse(await req.json()) } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  try {
    const existing = await sql`SELECT id FROM "Profile" WHERE "userId" = ${userId} LIMIT 1`
    if (existing.length === 0) {
      await sql`
        INSERT INTO "Profile" (id, "userId", "preferredName", "legalName", "altName", phone, city, state, country,
          "primaryCurrency", "ghanaOps", "riskTolerance", "financialGoal", "northStar", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${userId},
          ${body.preferredName ?? null}, ${body.legalName ?? null}, ${body.altName ?? null},
          ${body.phone ?? null}, ${body.city ?? null}, ${body.state ?? null}, ${body.country ?? 'US'},
          ${body.primaryCurrency ?? 'USD'}, ${body.ghanaOps ?? false},
          ${body.riskTolerance ?? 'moderate'}, ${body.financialGoal ?? null}, ${body.northStar ?? null},
          NOW(), NOW())
      `
    } else {
      // COALESCE: only update fields that were provided (non-undefined)
      await sql`
        UPDATE "Profile" SET
          "preferredName" = COALESCE(${body.preferredName ?? null}, "preferredName"),
          "legalName"     = COALESCE(${body.legalName ?? null}, "legalName"),
          "altName"       = COALESCE(${body.altName ?? null}, "altName"),
          phone           = COALESCE(${body.phone ?? null}, phone),
          city            = COALESCE(${body.city ?? null}, city),
          state           = COALESCE(${body.state ?? null}, state),
          country         = COALESCE(${body.country ?? null}, country),
          "primaryCurrency" = COALESCE(${body.primaryCurrency ?? null}, "primaryCurrency"),
          "ghanaOps"      = COALESCE(${body.ghanaOps ?? null}, "ghanaOps"),
          "riskTolerance" = COALESCE(${body.riskTolerance ?? null}, "riskTolerance"),
          "financialGoal" = COALESCE(${body.financialGoal ?? null}, "financialGoal"),
          "northStar"     = COALESCE(${body.northStar ?? null}, "northStar"),
          "updatedAt"     = NOW()
        WHERE "userId" = ${userId}
      `
    }
    const updated = await sql`SELECT * FROM "Profile" WHERE "userId" = ${userId} LIMIT 1`
    return NextResponse.json({ success: true, profile: updated[0] })
  } catch (e: any) {
    console.error('[profile] patch error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
