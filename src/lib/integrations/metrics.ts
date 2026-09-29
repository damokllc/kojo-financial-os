import crypto from 'crypto'
import { sql } from '@/lib/db/neon'

/**
 * Daily snapshots of live business numbers (Shopify today; YouTube / MEBA backend later).
 * The table is created on first use (this database isn't managed by Prisma Migrate).
 */
let ensured = false
export async function ensureMetricsTable() {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS "BusinessMetric" (
      id           TEXT PRIMARY KEY,
      "userId"     TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "businessId" TEXT REFERENCES "Business"(id) ON DELETE CASCADE,
      source       TEXT NOT NULL,
      metric       TEXT NOT NULL,
      value        NUMERIC(15,2) NOT NULL,
      meta         JSONB,
      "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  await sql`CREATE INDEX IF NOT EXISTS "BusinessMetric_business_metric_time"
            ON "BusinessMetric" ("businessId", metric, "capturedAt" DESC)`
  ensured = true
}

export async function recordMetric(m: {
  userId: string
  businessId: string | null
  source: string
  metric: string
  value: number
  meta?: unknown
}) {
  await sql`
    INSERT INTO "BusinessMetric" (id, "userId", "businessId", source, metric, value, meta)
    VALUES (${'bm_' + crypto.randomBytes(10).toString('hex')}, ${m.userId}, ${m.businessId}, ${m.source},
            ${m.metric}, ${m.value}, ${m.meta ? JSON.stringify(m.meta) : null}::jsonb)`
}

export type LatestMetric = { businessName: string; source: string; metric: string; value: number; meta: any; capturedAt: string }

/** Latest value of each metric per business (last 14 days). Returns [] if the table doesn't exist yet. */
export async function getLatestMetrics(userId: string): Promise<LatestMetric[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT ON (m."businessId", m.metric)
             b.name AS "businessName", m.source, m.metric, m.value, m.meta, m."capturedAt"
      FROM "BusinessMetric" m
      JOIN "Business" b ON b.id = m."businessId"
      WHERE m."userId" = ${userId} AND m."capturedAt" > NOW() - INTERVAL '14 days'
      ORDER BY m."businessId", m.metric, m."capturedAt" DESC`
    return rows.map((r: any) => ({ ...r, value: Number(r.value) })) as LatestMetric[]
  } catch {
    return []
  }
}
