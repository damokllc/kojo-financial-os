import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { sql } from '@/lib/db/neon'

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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { public_token } = await req.json()
  if (!public_token) return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })

  try {
    // Exchange public token for access token
    const exchangeRes = await plaid.itemPublicTokenExchange({ public_token })
    const accessToken = exchangeRes.data.access_token
    const itemId = exchangeRes.data.item_id

    // Get institution info
    const itemRes = await plaid.itemGet({ access_token: accessToken })
    const instId = itemRes.data.item.institution_id
    let institutionName = 'Unknown Bank'
    if (instId) {
      const instRes = await plaid.institutionsGetById({ institution_id: instId, country_codes: ['US'] as any })
      institutionName = instRes.data.institution.name
    }

    // Store the item (upsert)
    const id = crypto.randomUUID()
    await sql`
      INSERT INTO "PlaidItem" (id, "userId", "itemId", "accessToken", "institutionId", "institutionName", "createdAt", "updatedAt")
      VALUES (${id}, ${userId}, ${itemId}, ${accessToken}, ${instId ?? null}, ${institutionName}, NOW(), NOW())
      ON CONFLICT ("itemId") DO UPDATE SET
        "accessToken" = EXCLUDED."accessToken",
        "institutionName" = EXCLUDED."institutionName",
        "updatedAt" = NOW()
    `

    // Pull accounts from Plaid and upsert into FinancialAccount
    const accountsRes = await plaid.accountsGet({ access_token: accessToken })
    const plaidAccounts = accountsRes.data.accounts

    const typeMap: Record<string, string> = {
      depository: 'CHECKING',
      credit: 'CREDIT_CARD',
      loan: 'OTHER',
      investment: 'INVESTMENT',
      brokerage: 'INVESTMENT',
      other: 'OTHER',
    }
    const subtypeMap: Record<string, string> = {
      checking: 'CHECKING',
      savings: 'SAVINGS',
      cd: 'SAVINGS',
      'money market': 'SAVINGS',
      ira: 'RETIREMENT',
      '401k': 'RETIREMENT',
      brokerage: 'INVESTMENT',
    }

    let synced = 0
    for (const acc of plaidAccounts) {
      const balance = acc.balances.current ?? acc.balances.available ?? 0
      const subtype = acc.subtype?.toLowerCase() ?? ''
      const accType = subtypeMap[subtype] || typeMap[acc.type?.toLowerCase() ?? ''] || 'OTHER'
      const accId = crypto.randomUUID()

      await sql`
        INSERT INTO "FinancialAccount"
          (id, "userId", name, type, institution, balance, currency, "plaidItemId", "plaidAccId", "dataStatus", "lastVerified", "isActive", "createdAt", "updatedAt")
        VALUES
          (${accId}, ${userId}, ${acc.name}, ${accType}::"AccountType", ${institutionName},
           ${balance}, ${acc.balances.iso_currency_code ?? 'USD'},
           ${itemId}, ${acc.account_id}, 'VERIFIED', NOW(), true, NOW(), NOW())
        ON CONFLICT ("plaidAccId") DO UPDATE SET
          balance = EXCLUDED.balance,
          "dataStatus" = 'VERIFIED',
          "lastVerified" = NOW(),
          "updatedAt" = NOW()
      `
      synced++
    }

    return NextResponse.json({ success: true, institution: institutionName, accountsSynced: synced })
  } catch (e: any) {
    console.error('Plaid exchange error:', e.response?.data || e.message)
    return NextResponse.json({ error: e.response?.data?.error_message || e.message }, { status: 500 })
  }
}
