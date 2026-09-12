-- ============================================================
-- KOJO FINANCIAL OS - Complete Schema
-- Paste this entire file into Neon SQL Editor and run it.
-- ============================================================

-- ─── ENUMS ──────────────────────────────────────────────────

CREATE TYPE "AccountType" AS ENUM (
  'CHECKING','SAVINGS','CREDIT_CARD','LOAN','INVESTMENT',
  'RETIREMENT','CRYPTO','BUSINESS_CHECKING','BUSINESS_SAVINGS',
  'MOBILE_MONEY','OTHER'
);

CREATE TYPE "DataStatus" AS ENUM (
  'VERIFIED','USER_PROVIDED','IMPORTED','HISTORICAL',
  'ESTIMATED','ASSUMED','UNVERIFIED','UNKNOWN'
);

CREATE TYPE "DebtType" AS ENUM (
  'AUTO_LOAN','STUDENT_LOAN','CREDIT_CARD','PERSONAL_LOAN',
  'MORTGAGE','BUSINESS_LOAN','MEDICAL','COLLECTION','OTHER'
);

CREATE TYPE "DebtStatus" AS ENUM (
  'CURRENT','LATE_30','LATE_60','LATE_90',
  'COLLECTION','CHARGED_OFF','PAID','DISPUTED'
);

CREATE TYPE "AssetType" AS ENUM (
  'VEHICLE','REAL_ESTATE','BUSINESS_EQUITY','INVESTMENT','CASH',
  'CRYPTO','INTELLECTUAL_PROPERTY','EQUIPMENT','INVENTORY','LAND','OTHER'
);

CREATE TYPE "BusinessGrade" AS ENUM ('A','B','C','D','E','F','G');

CREATE TYPE "CreditBureau" AS ENUM ('EQUIFAX','EXPERIAN','TRANSUNION');

CREATE TYPE "DataIssueType" AS ENUM (
  'INACCURATE','INCOMPLETE','DUPLICATE','NOT_MINE',
  'WRONG_DATE','WRONG_BALANCE','WRONG_STATUS','UNKNOWN'
);

CREATE TYPE "DisputeStatus" AS ENUM (
  'NOT_DISPUTED','PENDING','SUBMITTED','IN_REVIEW',
  'RESOLVED_CORRECTED','RESOLVED_DELETED','RESOLVED_VERIFIED','ESCALATED'
);

CREATE TYPE "DocumentCategory" AS ENUM (
  'CREDIT_REPORT','BANK_STATEMENT','TAX_DOCUMENT','LOAN_DOCUMENT',
  'INSURANCE','CONTRACT','BUSINESS_DOCUMENT','RECEIPT','INVOICE',
  'LEGAL','PROPERTY','VEHICLE','INVESTMENT_STATEMENT','IDENTITY','OTHER'
);

CREATE TYPE "Priority" AS ENUM ('CRITICAL','HIGH','MEDIUM','LOW');

CREATE TYPE "TaskStatus" AS ENUM ('PENDING','IN_PROGRESS','DONE','CANCELLED');

CREATE TYPE "MemoryCategory" AS ENUM (
  'PERSONAL','FINANCIAL','BUSINESS','PROJECT',
  'DECISION','CONVERSATION','OPEN_LOOP','PREFERENCE','GOAL','WEEKLY_REVIEW'
);

CREATE TYPE "AlertType" AS ENUM (
  'CASH','BILL','CREDIT','DEBT','BUSINESS',
  'PROJECT','OPPORTUNITY','IDENTITY','SYSTEM'
);

-- ─── TABLES ─────────────────────────────────────────────────

CREATE TABLE "User" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "email"        TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name"         TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastLoginAt"  TIMESTAMPTZ,
  "mfaEnabled"   BOOLEAN NOT NULL DEFAULT false,
  "mfaSecret"    TEXT
);

CREATE TABLE "Session" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token"     TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Profile" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "userId"          TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "legalName"       TEXT,
  "preferredName"   TEXT,
  "altName"         TEXT,
  "phone"           TEXT,
  "city"            TEXT,
  "state"           TEXT,
  "country"         TEXT NOT NULL DEFAULT 'US',
  "dateOfBirth"     TIMESTAMPTZ,
  "ssn"             TEXT,
  "riskTolerance"   TEXT NOT NULL DEFAULT 'medium',
  "primaryCurrency" TEXT NOT NULL DEFAULT 'USD',
  "ghanaOps"        BOOLEAN NOT NULL DEFAULT false,
  "financialGoal"   TEXT,
  "northStar"       TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Document" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "userId"        TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"         TEXT NOT NULL,
  "category"      "DocumentCategory" NOT NULL,
  "fileKey"       TEXT NOT NULL,
  "fileType"      TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "uploadedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt"     TIMESTAMPTZ,
  "extractedData" JSONB,
  "confidence"    NUMERIC(3,2),
  "relatedEntity" TEXT,
  "relatedDebtId" TEXT,
  "notes"         TEXT
);

CREATE TABLE "Business" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "userId"          TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"            TEXT NOT NULL,
  "legalName"       TEXT,
  "entityType"      TEXT,
  "grade"           "BusinessGrade" NOT NULL DEFAULT 'D',
  "stage"           INTEGER NOT NULL DEFAULT 1,
  "industry"        TEXT,
  "description"     TEXT,
  "monthlyRevenue"  NUMERIC(15,2) NOT NULL DEFAULT 0,
  "monthlyExpenses" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "monthlyProfit"   NUMERIC(15,2) NOT NULL DEFAULT 0,
  "isGhana"         BOOLEAN NOT NULL DEFAULT false,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "startDate"       TIMESTAMPTZ,
  "killDate"        TIMESTAMPTZ,
  "maxCapital"      NUMERIC(15,2),
  "targetRevenue"   NUMERIC(15,2),
  "deadline"        TIMESTAMPTZ,
  "ownerDependency" INTEGER NOT NULL DEFAULT 10,
  "notes"           TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "FinancialAccount" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"         TEXT NOT NULL,
  "institution"  TEXT,
  "type"         "AccountType" NOT NULL,
  "subtype"      TEXT,
  "balance"      NUMERIC(15,2) NOT NULL DEFAULT 0,
  "currency"     TEXT NOT NULL DEFAULT 'USD',
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "plaidItemId"  TEXT,
  "plaidAccId"   TEXT,
  "dataStatus"   "DataStatus" NOT NULL DEFAULT 'UNKNOWN',
  "lastVerified" TIMESTAMPTZ,
  "notes"        TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Transaction" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "accountId"   TEXT REFERENCES "FinancialAccount"("id"),
  "date"        TIMESTAMPTZ NOT NULL,
  "description" TEXT NOT NULL,
  "amount"      NUMERIC(15,2) NOT NULL,
  "category"    TEXT,
  "subcategory" TEXT,
  "businessId"  TEXT REFERENCES "Business"("id"),
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "dataStatus"  "DataStatus" NOT NULL DEFAULT 'USER_PROVIDED',
  "notes"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Debt" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "userId"          TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "creditor"        TEXT NOT NULL,
  "accountNumber"   TEXT,
  "type"            "DebtType" NOT NULL,
  "originalBalance" NUMERIC(15,2) NOT NULL,
  "currentBalance"  NUMERIC(15,2) NOT NULL,
  "apr"             NUMERIC(6,4) NOT NULL,
  "minimumPayment"  NUMERIC(15,2) NOT NULL,
  "dueDate"         INTEGER,
  "termMonths"      INTEGER,
  "startDate"       TIMESTAMPTZ,
  "payoffDate"      TIMESTAMPTZ,
  "status"          "DebtStatus" NOT NULL DEFAULT 'CURRENT',
  "dataStatus"      "DataStatus" NOT NULL DEFAULT 'USER_PROVIDED',
  "lastVerified"    TIMESTAMPTZ,
  "notes"           TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Asset" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "type"       "AssetType" NOT NULL,
  "value"      NUMERIC(15,2) NOT NULL,
  "currency"   TEXT NOT NULL DEFAULT 'USD',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'ESTIMATED',
  "lastValued" TIMESTAMPTZ,
  "notes"      TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "BusinessScore" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "businessId"       TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "scoredAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "revenuePotential" INTEGER NOT NULL,
  "profitPotential"  INTEGER NOT NULL,
  "startupCost"      INTEGER NOT NULL,
  "speedToRevenue"   INTEGER NOT NULL,
  "recurringRevenue" INTEGER NOT NULL,
  "scalability"      INTEGER NOT NULL,
  "automation"       INTEGER NOT NULL,
  "moat"             INTEGER NOT NULL,
  "synergy"          INTEGER NOT NULL,
  "risk"             INTEGER NOT NULL,
  "complexity"       INTEGER NOT NULL,
  "infrastructure"   INTEGER NOT NULL,
  "ownerIndependence" INTEGER NOT NULL,
  "exitPotential"    INTEGER NOT NULL,
  "weightedTotal"    NUMERIC(5,2) NOT NULL,
  "notes"            TEXT
);

CREATE TABLE "CreditReport" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "bureau"      "CreditBureau" NOT NULL,
  "reportDate"  TIMESTAMPTZ NOT NULL,
  "score"       INTEGER,
  "uploadedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "documentId"  TEXT REFERENCES "Document"("id"),
  "parseStatus" TEXT NOT NULL DEFAULT 'pending',
  "rawText"     TEXT
);

CREATE TABLE "CreditAccount" (
  "id"                  TEXT NOT NULL PRIMARY KEY,
  "reportId"            TEXT NOT NULL REFERENCES "CreditReport"("id") ON DELETE CASCADE,
  "creditorName"        TEXT NOT NULL,
  "creditorNormalized"  TEXT,
  "accountNumber"       TEXT,
  "accountType"         TEXT,
  "balance"             NUMERIC(15,2),
  "creditLimit"         NUMERIC(15,2),
  "highBalance"         NUMERIC(15,2),
  "paymentStatus"       TEXT,
  "openDate"            TIMESTAMPTZ,
  "closeDate"           TIMESTAMPTZ,
  "lastActivity"        TIMESTAMPTZ,
  "monthsHistory"       INTEGER,
  "latePayments30"      INTEGER NOT NULL DEFAULT 0,
  "latePayments60"      INTEGER NOT NULL DEFAULT 0,
  "latePayments90"      INTEGER NOT NULL DEFAULT 0,
  "isCollection"        BOOLEAN NOT NULL DEFAULT false,
  "isChargeOff"         BOOLEAN NOT NULL DEFAULT false,
  "dataIssueType"       "DataIssueType",
  "dataIssueNote"       TEXT,
  "disputeStatus"       "DisputeStatus" NOT NULL DEFAULT 'NOT_DISPUTED'
);

CREATE TABLE "CreditInquiry" (
  "id"       TEXT NOT NULL PRIMARY KEY,
  "reportId" TEXT NOT NULL REFERENCES "CreditReport"("id") ON DELETE CASCADE,
  "creditor" TEXT NOT NULL,
  "date"     TIMESTAMPTZ,
  "type"     TEXT
);

CREATE TABLE "CreditPublicRecord" (
  "id"       TEXT NOT NULL PRIMARY KEY,
  "reportId" TEXT NOT NULL REFERENCES "CreditReport"("id") ON DELETE CASCADE,
  "type"     TEXT NOT NULL,
  "court"    TEXT,
  "amount"   NUMERIC(15,2),
  "date"     TIMESTAMPTZ,
  "status"   TEXT
);

CREATE TABLE "CreditDispute" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "accountId"        TEXT NOT NULL REFERENCES "CreditAccount"("id") ON DELETE CASCADE,
  "basis"            TEXT NOT NULL,
  "evidenceDesc"     TEXT,
  "submittedAt"      TIMESTAMPTZ,
  "responseDeadline" TIMESTAMPTZ,
  "responseAt"       TIMESTAMPTZ,
  "result"           TEXT,
  "outcome"          TEXT,
  "nextAction"       TEXT,
  "notes"            TEXT,
  "status"           "DisputeStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Task" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "text"        TEXT NOT NULL,
  "priority"    "Priority" NOT NULL DEFAULT 'MEDIUM',
  "category"    TEXT,
  "status"      "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "dueDate"     TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "businessId"  TEXT,
  "notes"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "OpenLoop" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "text"        TEXT NOT NULL,
  "priority"    "Priority" NOT NULL DEFAULT 'MEDIUM',
  "status"      "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "nextAction"  TEXT,
  "dueDate"     TIMESTAMPTZ,
  "followUpAt"  TIMESTAMPTZ,
  "closedAt"    TIMESTAMPTZ,
  "closedNote"  TEXT,
  "source"      TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Decision" (
  "id"                  TEXT NOT NULL PRIMARY KEY,
  "userId"              TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "date"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "decision"            TEXT NOT NULL,
  "situation"           TEXT,
  "optionsConsidered"   TEXT,
  "capitalRequired"     NUMERIC(15,2),
  "expectedReturn"      NUMERIC(15,2),
  "expectedRisk"        TEXT,
  "reasoning"           TEXT,
  "aiRecommendation"    TEXT,
  "kojoDecision"        TEXT,
  "expectedOutcome"     TEXT,
  "actualOutcome"       TEXT,
  "lesson"              TEXT,
  "status"              TEXT NOT NULL DEFAULT 'active',
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Memory" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "category"   "MemoryCategory" NOT NULL,
  "key"        TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "confidence" TEXT NOT NULL DEFAULT 'USER_PROVIDED',
  "expiresAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "category", "key")
);

CREATE TABLE "Conversation" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"     TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "ConversationMessage" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "role"           TEXT NOT NULL,
  "content"        TEXT NOT NULL,
  "toolsUsed"      JSONB,
  "tokensUsed"     INTEGER,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Alert" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type"        "AlertType" NOT NULL,
  "priority"    "Priority" NOT NULL,
  "title"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "isRead"      BOOLEAN NOT NULL DEFAULT false,
  "isDismissed" BOOLEAN NOT NULL DEFAULT false,
  "actionUrl"   TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt"   TIMESTAMPTZ
);

CREATE TABLE "Goal" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "userId"        TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"         TEXT NOT NULL,
  "category"      TEXT NOT NULL,
  "targetAmount"  NUMERIC(15,2),
  "targetDate"    TIMESTAMPTZ,
  "currentAmount" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "status"        TEXT NOT NULL DEFAULT 'active',
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "FinancialSnapshot" (
  "id"                   TEXT NOT NULL PRIMARY KEY,
  "userId"               TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "snapshotDate"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "totalAssets"          NUMERIC(15,2) NOT NULL,
  "totalLiabilities"     NUMERIC(15,2) NOT NULL,
  "netWorth"             NUMERIC(15,2) NOT NULL,
  "liquidCash"           NUMERIC(15,2) NOT NULL,
  "monthlyIncome"        NUMERIC(15,2) NOT NULL,
  "monthlyExpenses"      NUMERIC(15,2) NOT NULL,
  "monthlyDebtService"   NUMERIC(15,2) NOT NULL,
  "creditScore"          INTEGER,
  "businessRevenue"      NUMERIC(15,2) NOT NULL,
  "businessProfit"       NUMERIC(15,2) NOT NULL,
  "financialFreedomScore" INTEGER,
  "creditHealthScore"    INTEGER,
  "dataQualityScore"     INTEGER,
  "notes"                TEXT
);

CREATE TABLE "AuditLog" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "userId"           TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action"           TEXT NOT NULL,
  "entity"           TEXT,
  "entityId"         TEXT,
  "dataUsed"         JSONB,
  "aiRecommendation" TEXT,
  "kojoApproved"     BOOLEAN,
  "result"           TEXT,
  "ipAddress"        TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Done! All 25 tables created.
