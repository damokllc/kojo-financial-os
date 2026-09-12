import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_ENV === 'production'
        ? (process.env.PLAID_SECRET_PRODUCTION || '')
        : (process.env.PLAID_SECRET_SANDBOX || ''),
    },
  },
})

const plaid = new PlaidApi(plaidConfig)

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET_SANDBOX) {
    return NextResponse.json({ error: 'Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET_SANDBOX to .env.local' }, { status: 503 })
  }

  try {
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: 'Kojo Financial OS',
      products: [Products.Transactions, Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: 'en',
    })
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
