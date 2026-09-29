import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sql } from '@/lib/db/neon'
import { runSync } from '@/lib/integrations/sync'
import { getLatestMetrics } from '@/lib/integrations/metrics'

export const dynamic = 'force-dynamic'

function secretMatches(given: string | null): boolean {
  const expected = process.env.SYNC_SECRET
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Resolve the user: a signed-in session, or the daily job using SYNC_SECRET (+ SYNC_USER_EMAIL). */
async function resolveUserId(req: Request): Promise<string | null> {
  const session = await auth()
  if (session?.user?.id) return session.user.id
  if (!secretMatches(req.headers.get('x-sync-secret'))) return null
  const email = (process.env.SYNC_USER_EMAIL || '').toLowerCase()
  if (!email) return null
  const rows = await sql`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`
  return (rows[0] as { id: string } | undefined)?.id ?? null
}

export async function POST(req: Request) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const results = await runSync(userId)
  return NextResponse.json({ syncedAt: new Date().toISOString(), results })
}

export async function GET(req: Request) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ metrics: await getLatestMetrics(userId) })
}
