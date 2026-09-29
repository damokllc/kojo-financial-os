/**
 * Shopify Admin API (read-only) for the Mi Meba store.
 *
 * Env:
 *   SHOPIFY_STORE_DOMAIN   e.g. k1swjz-si.myshopify.com
 *   Either (preferred, Dev Dashboard app installed on your own store):
 *     SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET  → exchanged for a 24h token (client_credentials grant)
 *   Or (legacy admin-created custom app):
 *     SHOPIFY_ADMIN_TOKEN    shpat_...
 *   SHOPIFY_API_VERSION    optional, default 2026-07
 * Scopes needed: read_orders, read_products
 */

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07'

export function isShopifyConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN &&
      (process.env.SHOPIFY_ADMIN_TOKEN || (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET))
  )
}

function shopDomain(): string {
  const d = (process.env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(d)) throw new Error('SHOPIFY_STORE_DOMAIN must look like name.myshopify.com')
  return d
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) return cachedToken.token
  const res = await fetch(`https://${shopDomain()}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SHOPIFY_CLIENT_ID || '',
      client_secret: process.env.SHOPIFY_CLIENT_SECRET || '',
    }),
  })
  if (!res.ok) throw new Error(`Shopify token request failed (${res.status})`)
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Shopify token response had no access_token')
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 86399) * 1000 }
  return json.access_token
}

async function shopifyGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`https://${shopDomain()}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify API error (${res.status})`)
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (json.errors?.length) throw new Error(`Shopify: ${json.errors.map(e => e.message).join('; ')}`)
  if (!json.data) throw new Error('Shopify returned no data')
  return json.data
}

const ORDERS_QUERY = `
query AxiomShopifySync($q: String!, $after: String) {
  shop { name currencyCode }
  productsCount { count }
  orders(first: 100, after: $after, query: $q, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      name
      createdAt
      cancelledAt
      test
      displayFinancialStatus
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      lineItems(first: 20) { nodes { title quantity } }
    }
  }
}`

type OrderNode = {
  id: string
  name: string
  createdAt: string
  cancelledAt: string | null
  test: boolean
  displayFinancialStatus: string | null
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  lineItems: { nodes: { title: string; quantity: number }[] }
}
type OrdersResponse = {
  shop: { name: string; currencyCode: string }
  productsCount: { count: number } | null
  orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: OrderNode[] }
}

export type ShopifySummary = {
  shopName: string
  currency: string
  windowDays: number
  orders: number
  revenue: number
  averageOrderValue: number
  productsCount: number | null
  lastOrderAt: string | null
  topProducts: { title: string; quantity: number }[]
}

const COUNTED_STATUSES = new Set(['PAID', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED', 'AUTHORIZED'])

/** Pure aggregation — exported for tests. Skips test and cancelled orders and unpaid/refunded ones. */
export function summarizeOrders(orders: OrderNode[]) {
  const counted = orders.filter(
    o => !o.test && !o.cancelledAt && COUNTED_STATUSES.has((o.displayFinancialStatus || '').toUpperCase())
  )
  const revenue = counted.reduce((s, o) => s + Number(o.currentTotalPriceSet?.shopMoney?.amount || 0), 0)
  const byProduct = new Map<string, number>()
  for (const o of counted) for (const li of o.lineItems.nodes) byProduct.set(li.title, (byProduct.get(li.title) || 0) + li.quantity)
  const topProducts = [...byProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title, quantity]) => ({ title, quantity }))
  const lastOrderAt = counted.reduce<string | null>((m, o) => (!m || o.createdAt > m ? o.createdAt : m), null)
  return {
    orders: counted.length,
    revenue: Math.round(revenue * 100) / 100,
    averageOrderValue: counted.length ? Math.round((revenue / counted.length) * 100) / 100 : 0,
    topProducts,
    lastOrderAt,
  }
}

export async function fetchShopifySummary(windowDays = 30): Promise<ShopifySummary> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10)
  const q = `created_at:>=${since}`
  const all: OrderNode[] = []
  let after: string | null = null
  let meta: Pick<OrdersResponse, 'shop' | 'productsCount'> | null = null
  for (let page = 0; page < 20; page++) {
    const data: OrdersResponse = await shopifyGraphQL<OrdersResponse>(ORDERS_QUERY, { q, after })
    meta ??= { shop: data.shop, productsCount: data.productsCount }
    all.push(...data.orders.nodes)
    if (!data.orders.pageInfo.hasNextPage) break
    after = data.orders.pageInfo.endCursor
  }
  const s = summarizeOrders(all)
  return {
    shopName: meta?.shop.name ?? '',
    currency: meta?.shop.currencyCode ?? 'USD',
    windowDays,
    productsCount: meta?.productsCount?.count ?? null,
    ...s,
  }
}
