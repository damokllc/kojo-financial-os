import { auth } from '@/lib/auth'
import { sql } from '@/lib/db/neon'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = session.user.id

  // Get last 4 weeks of reviews
  const rows = await sql`
    SELECT key, value, "updatedAt"
    FROM "Memory"
    WHERE "userId" = ${userId} AND category = 'WEEKLY_REVIEW'
    ORDER BY key DESC
    LIMIT 4
  `

  return Response.json({ reviews: rows })
}
