-- ============================================================
-- Migration 05: Patch missing columns & enum values
-- Safe to run multiple times (IF NOT EXISTS guards)
-- Run in Neon SQL Editor: console.neon.tech
-- ============================================================

-- 1. Extend TaskStatus enum for OpenLoop status values used in routes
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'WAITING';

-- 2. Add priority column to Goal table (used in goals/route.ts ORDER BY + INSERT)
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'MEDIUM';

-- 3. Add category column to OpenLoop table (used in loops/route.ts INSERT)
ALTER TABLE "OpenLoop" ADD COLUMN IF NOT EXISTS category TEXT;

-- 4. Add accountNumber column to FinancialAccount (used in accounts/route.ts INSERT)
ALTER TABLE "FinancialAccount" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;

-- 5. Add snapshotDay + createdAt to FinancialSnapshot (used in snapshot/route.ts)
ALTER TABLE "FinancialSnapshot" ADD COLUMN IF NOT EXISTS "snapshotDay" DATE;
ALTER TABLE "FinancialSnapshot" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint on (userId, snapshotDay) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FinancialSnapshot_userId_snapshotDay_key'
  ) THEN
    ALTER TABLE "FinancialSnapshot"
      ADD CONSTRAINT "FinancialSnapshot_userId_snapshotDay_key"
      UNIQUE ("userId", "snapshotDay");
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 6. Add missing Business columns (used in businesses/route.ts INSERT)
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "dataStatus" TEXT DEFAULT 'USER_PROVIDED';
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'P3';
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "projectState" TEXT DEFAULT 'ACTIVE';

-- 7. Backfill snapshotDay from existing snapshotDate values
UPDATE "FinancialSnapshot"
SET "snapshotDay" = "snapshotDate"::date
WHERE "snapshotDay" IS NULL;

-- Verify after running:
-- SELECT enum_range(NULL::"TaskStatus");
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'Goal' ORDER BY ordinal_position;
