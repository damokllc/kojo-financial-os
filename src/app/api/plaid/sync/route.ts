import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
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

/** Idempotent — adds plaidTxId column + unique constraint if missing */
async function ensureMigration() {
  try {
    await sql`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "plaidTxId" TEXT`
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_plaidTxId_key')
        THEN ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_plaidTxId_key" UNIQUE ("plaidTxId");
        END IF;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `
  } catch {
    // Non-fatal — column may already exist
  }
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  // Auto-apply migration on first sync (idempotent)
  await ensureMigration()

  try {
    const items = await sql`SELECT * FROM "PlaidItem" WHERE "userId" = ${userId}`
    if (!items.length) return NextResponse.json({ message: 'No linked accounts', synced: 0 })

    let totalSynced = 0
    let totalAdded = 0
    let totalModified = 0
    let totalRemoved = 0

    for (const item of items as any[]) {
      // ── 1. Refresh balances ──────────────────────────────────────────────
      const accountsRes = await plaid.accountsGet({ access_token: item.accessToken })
      for (const acc of accountsRes.data.accounts) {
        const balance = acc.balances.current ?? acc.balances.available ?? 0
        await sql`
          UPDATE "FinancialAccount"
          SET balance = ${balance}, "dataStatus" = 'VERIFIED', "lastVerified" = NOW(), "updatedAt" = NOW()
          WHERE "plaidAccId" = ${acc.account_id} AND "userId" = ${userId}
        `
        totalSynced++
      }

      // ── 2. Sync transactions (cursor-based) ──────────────────────────────
      let cursor: string | undefined = item.cursor ?? undefined
      let hasMore = true

      while (hasMore) {
        const txRes = await plaid.transactionsSync({
          access_token: item.accessToken,
          cursor,
          count: 100,
        })

        // ADDED
        for (const tx of txRes.data.added) {
          const accs = await sql`
            SELECT id FROM "FinancialAccount"
            WHERE "plaidAccId" = ${tx.account_id} AND "userId" = ${userId}
            LIMIT 1
          `
          const accountId = (accs[0] as any)?.id ?? null
          const amount = -(tx.amount) // Plaid positive = debit; we use positive = credit
          const category =
            (tx as any).personal_finance_category?.primary ?? (tx.category?.[0] ?? null)

          await sql`
            INSERT INTO "Transaction"
              (id, "userId", "accountId", date, description, amount, category,
               "plaidTxId", "isRecurring", "dataStatus", "createdAt", "updatedAt")
            VALUES
              (${crypto.randomUUID()}, ${userId}, ${accountId},
               ${tx.date}::date, ${tx.name}, ${amount}, ${category},
               ${tx.transaction_id}, false, 'VERIFIED', NOW(), NOW())
            ON CONFLICT ("plaidTxId") DO UPDATE SET
              amount      = EXCLUDED.amount,
              description = EXCLUDED.description,
              category    = EXCLUDED.category,
              "updatedAt" = NOW()
          `
          totalAdded++
        }

        // MODIFIED
        for (const tx of txRes.data.modified) {
          const amount = -(tx.amount)
          const category =
            (tx as any).personal_finance_category?.primary ?? (tx.category?.[0] ?? null)
          await sql`
            UPDATE "Transaction"
            SET amount = ${amount}, description = ${tx.name},
                category = ${category}, "updatedAt" = NOW()
            WHERE "plaidTxId" = ${tx.transaction_id} AND "userId" = ${userId}
          `
          totalModified++
        }

        // REMOVED
        for (const tx of txRes.data.removed) {
          await sql`
            DELETE FROM "Transaction"
            WHERE "plaidTxId" = ${tx.transaction_id} AND "userId" = ${userId}
          `
          totalRemoved++
        }

        cursor = txRes.data.next_cursor
        hasMore = txRes.data.has_more
      }

      // Save cursor so next sync only fetches changes
      await sql`
        UPDATE "PlaidItem"
        SET cursor = ${cursor ?? null}, "lastSync" = NOW(), "updatedAt" = NOW()
        WHERE id = ${item.id}
      `
    }

    return NextResponse.json({
      success: true,
      accountsUpdated: totalSynced,
      transactionsAdded: totalAdded,
      transactionsModified: totalModified,
      transactionsRemoved: totalRemoved,
    })
  } catch (e: any) {
    console.error('Plaid sync error:', e.response?.data || e.message)
    return NextResponse.json({ error: e.response?.data?.error_message || e.message }, { status: 500 })
  }
}
