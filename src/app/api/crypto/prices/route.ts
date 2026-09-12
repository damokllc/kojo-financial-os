import { NextRequest, NextResponse } from 'next/server'

// CoinGecko free API — no key required for basic use
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

// Map common ticker symbols to CoinGecko IDs
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', USDT: 'tether',
  BNB: 'binancecoin', XRP: 'ripple', USDC: 'usd-coin', ADA: 'cardano',
  AVAX: 'avalanche-2', DOGE: 'dogecoin', TRX: 'tron', DOT: 'polkadot',
  MATIC: 'matic-network', LINK: 'chainlink', UNI: 'uniswap', LTC: 'litecoin',
  BCH: 'bitcoin-cash', ALGO: 'algorand', XLM: 'stellar', VET: 'vechain',
  SHIB: 'shiba-inu', APE: 'apecoin', SAND: 'the-sandbox', MANA: 'decentraland',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbols = searchParams.get('symbols')?.split(',').map(s => s.trim().toUpperCase()) ?? []
  const ids = searchParams.get('ids')?.split(',').map(s => s.trim()) ?? []

  const resolvedIds = [
    ...ids,
    ...symbols.map(s => SYMBOL_TO_ID[s]).filter(Boolean),
  ]

  if (!resolvedIds.length) return NextResponse.json({ prices: {} })

  try {
    const res = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=${resolvedIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
      { next: { revalidate: 60 } } // cache 60s
    )

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)
    const data = await res.json()

    // Map back to symbols
    const prices: Record<string, { id: string; usd: number; usd_24h_change: number; usd_market_cap: number }> = {}
    for (const [id, info] of Object.entries(data as any)) {
      prices[id] = { id, ...(info as any) }
    }
    // Also map by symbol for convenience
    for (const sym of symbols) {
      const id = SYMBOL_TO_ID[sym]
      if (id && prices[id]) prices[sym] = prices[id]
    }

    return NextResponse.json({ prices })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, prices: {} }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // POST with body { holdings: [{symbol, amount}] } → returns holdings with USD values
  const { holdings } = await req.json()
  if (!Array.isArray(holdings)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const symbols = [...new Set(holdings.map((h: any) => (h.symbol as string).toUpperCase()))]
  const ids = symbols.map(s => SYMBOL_TO_ID[s]).filter(Boolean)

  try {
    let prices: Record<string, number> = {}
    if (ids.length) {
      const res = await fetch(`${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd`)
      if (res.ok) {
        const data = await res.json()
        for (const sym of symbols) {
          const id = SYMBOL_TO_ID[sym]
          if (id && data[id]) prices[sym] = data[id].usd
        }
      }
    }

    const enriched = holdings.map((h: any) => {
      const sym = (h.symbol as string).toUpperCase()
      const price = prices[sym] ?? 0
      return { ...h, symbol: sym, priceUsd: price, valueUsd: price * Number(h.amount) }
    })
    const totalUsd = enriched.reduce((s: number, h: any) => s + h.valueUsd, 0)

    return NextResponse.json({ holdings: enriched, totalUsd })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
