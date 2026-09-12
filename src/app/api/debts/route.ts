import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'
import { z } from 'zod'

const createSchema = z.object({
  creditor: z.string().min(1).max(200),
  type: z.enum(['CREDIT_CARD','AUTO_LOAN','MORTGAGE','STUDENT_LOAN','PERSONAL_LOAN','MEDICAL','TAX','OTHER']),
  originalBalance: z.number().optional(),
  currentBalance: z.number(),
  apr: z.number().optional(),
  minimumPayment: z.number().optional(),
  status: z.enum(['CURRENT','LATE_30','LATE_60','LATE_90','COLLECTIONS','CHARGED_OFF','SETTLED','PAID']).default('CURRENT'),
  dueDate: z.number().optional(), // day of month
  notes: z.string().max(500).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await sql`SELECT * FROM "Debt" WHERE "userId" = ${session.user.id} ORDER BY "currentBalance" DESC`
    return NextResponse.json({ debts: rows })
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
      INSERT INTO "Debt" (id, "userId", creditor, type, "originalBalance", "currentBalance", apr, "minimumPayment", status, "dueDate", notes, "dataStatus", "createdAt", "updatedAt")
      VALUES (${id}, ${userId}, ${body.creditor}, ${body.type},
        ${body.originalBalance ?? body.currentBalance}, ${body.currentBalance},
        ${body.apr ?? null}, ${body.minimumPayment ?? null}, ${body.status},
        ${body.dueDate ?? null}, ${body.notes ?? null}, 'USER_PROVIDED', NOW(), NOW())
    `
    return NextResponse.json({ success: true, id })
  } catch (e: any) {
    console.error('[debts] post error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
