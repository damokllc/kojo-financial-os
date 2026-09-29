import { sql } from '@/lib/db/neon'
import { ensureMetricsTable, recordMetric } from './metrics'
import { fetchShopifySummary, isShopifyConfigured } from './shopify'

export type SyncResult = { source: string; ok: boolean; skipped?: string; error?: string; data?: unknown }

const SHOP_BUSINESS_NAME = () => process.env.SHOPIFY_BUSINESS_NAME || 'Mi Meba Shop'

async function syncShopify(userId: string): Promise<SyncResult> {
  if (!isShopifyConfigured()) return { source: 'shopify', ok: false, skipped: 'Shopify keys not set' }

  const rows = await sql`
    SELECT id, "monthlyExpenses" FROM "Business"
    WHERE "userId" = ${userId} AND lower(name) = lower(${SHOP_BUSINESS_NAME()}) LIMIT 1`
  const biz = rows[0] as { id: string; monthlyExpenses: string | number } | undefined
  if (!biz) return { source: 'shopify', ok: false, skipped: `No business named "${SHOP_BUSINESS_NAME()}"` }

  const s = await fetchShopifySummary(30)
  const meta = { shopName: s.shopName, currency: s.currency, windowDays: s.windowDays, topProducts: s.topProducts, lastOrderAt: s.lastOrderAt }
  const base = { userId, businessId: biz.id, source: 'shopify', meta }
  await recordMetric({ ...base, metric: 'revenue_30d', value: s.revenue })
  await recordMetric({ ...base, metric: 'orders_30d', value: s.orders })
  await recordMetric({ ...base, metric: 'aov_30d', value: s.averageOrderValue })
  if (s.productsCount != null) await recordMetric({ ...base, metric: 'products', value: s.productsCount })

  const profit = s.revenue - Number(biz.monthlyExpenses || 0)
  await sql`
    UPDATE "Business"
    SET "monthlyRevenue" = ${s.revenue}, "monthlyProfit" = ${profit}, "dataStatus" = 'VERIFIED', "updatedAt" = NOW()
    WHERE id = ${biz.id}`

  return { source: 'shopify', ok: true, data: s }
}

/** Runs every configured integration for one user. Each source fails independently. */
export async function runSync(userId: string): Promise<SyncResult[]> {
  await ensureMetricsTable()
  const results: SyncResult[] = []
  const sources: [string, (u: string) => Promise<SyncResult>][] = [['shopify', syncShopify]]
  for (const [name, fn] of sources) {
    try {
      results.push(await fn(userId))
    } catch (err) {
      const message = (err as Error).message
      console.error('[sync]', message)
      results.push({ source: name, ok: false, error: message })
    }
  }
  return results
}
