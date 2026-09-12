-- PlaidItem: stores encrypted Plaid access tokens per linked institution
CREATE TABLE IF NOT EXISTS "PlaidItem" (
  id              TEXT        PRIMARY KEY,
  "userId"        TEXT        NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "itemId"        TEXT        NOT NULL UNIQUE,
  "accessToken"   TEXT        NOT NULL,
  "institutionId" TEXT,
  "institutionName" TEXT,
  cursor          TEXT,
  "lastSync"      TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "PlaidItem_userId_idx" ON "PlaidItem"("userId");

-- Add plaidAccId unique constraint to FinancialAccount if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FinancialAccount_plaidAccId_key'
  ) THEN
    ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_plaidAccId_key" UNIQUE ("plaidAccId");
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
