import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  try {
    const banks = await sql`
      SELECT
        pi.id,
        pi."institutionName",
        pi."lastSync",
        COUNT(fa.id)::int AS "accountCount"
      FROM "PlaidItem" pi
      LEFT JOIN "FinancialAccount" fa
        ON fa."plaidItemId" = pi."itemId" AND fa."userId" = pi."userId"
      WHERE pi."userId" = ${userId}
      GROUP BY pi.id, pi."institutionName", pi."lastSync"
      ORDER BY pi."createdAt" DESC
    `
    return NextResponse.json({ banks })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
