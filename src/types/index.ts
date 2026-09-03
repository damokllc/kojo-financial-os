// ============================================================
// KOJO FINANCIAL OS — Core TypeScript Types
// ============================================================

export type BusinessGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type DataStatus = 'VERIFIED' | 'USER_PROVIDED' | 'IMPORTED' | 'HISTORICAL' | 'ESTIMATED' | 'ASSUMED' | 'UNVERIFIED' | 'UNKNOWN'
export type CreditBureau = 'EXPERIAN' | 'EQUIFAX' | 'TRANSUNION'
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'LOAN' | 'INVESTMENT' | 'CRYPTO' | 'CASH' | 'OTHER'
export type TransactionCategory =
  | 'INCOME_PRIMARY' | 'INCOME_SIDE' | 'INCOME_PASSIVE' | 'INCOME_OTHER'
  | 'HOUSING' | 'TRANSPORTATION' | 'FOOD' | 'HEALTH' | 'INSURANCE'
  | 'UTILITIES' | 'SUBSCRIPTIONS' | 'ENTERTAINMENT' | 'CLOTHING'
  | 'PERSONAL_CARE' | 'EDUCATION' | 'BUSINESS_EXPENSE' | 'DEBT_PAYMENT'
  | 'SAVINGS' | 'INVESTMENT' | 'TRANSFER' | 'OTHER'

export type LoopStatus = 'pending' | 'in_progress' | 'done' | 'blocked' | 'deferred'
export type LoopPriority = 'critical' | 'high' | 'medium' | 'low'

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertType =
  | 'CREDIT_SCORE_CHANGE' | 'CREDIT_INQUIRY' | 'PAYMENT_DUE' | 'LOW_BALANCE'
  | 'LARGE_TRANSACTION' | 'BUSINESS_MILESTONE' | 'OPEN_LOOP_DUE' | 'AI_INSIGHT' | 'GOAL_MILESTONE'

// ---- Financial Summary ----
export interface NetWorthSnapshot {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  date: Date
  dataQuality: DataStatus
}

export interface CashFlowSummary {
  totalIncome: number
  totalExpenses: number
  netFlow: number
  savingsRate: number
  month: string // YYYY-MM
}

// ---- Business ----
export interface BusinessScorecard {
  businessId: string
  name: string
  grade: BusinessGrade
  revenueScore: number       // 0-100
  profitMarginScore: number
  growthScore: number
  cashFlowScore: number
  scalabilityScore: number
  riskScore: number
  overallScore: number
  recommendation: string
}

// ---- Credit ----
export interface CreditSummary {
  score: number
  bureau: CreditBureau
  reportDate: Date
  totalAccounts: number
  openAccounts: number
  totalBalance: number
  totalLimit: number
  utilizationPct: number
  onTimePaymentPct: number
  oldestAccountYears: number
  inquiriesLast12Mo: number
  derogatoryMarks: number
  dataQuality: DataStatus
}

// ---- AI ----
export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface FinancialContext {
  netWorth: NetWorthSnapshot
  cashFlow: CashFlowSummary
  credit: CreditSummary
  openLoops: OpenLoopItem[]
  recentDecisions: DecisionEntry[]
  scores: FinancialScores
  businessCount: { A: number; B: number; C: number; D: number; E: number; F: number; G: number }
}

// ---- Open Loops ----
export interface OpenLoopItem {
  id: string
  text: string
  priority: LoopPriority
  status: LoopStatus
  deadline?: Date
  nextAction?: string
  addedDate: Date
  category?: string
  linkedBusinessId?: string
}

// ---- Decisions ----
export interface DecisionEntry {
  id: string
  date: Date
  decision: string
  context?: string
  alternatives?: string
  expectedOutcome?: string
  actualOutcome?: string
  lesson?: string
  tags: string[]
}

// ---- Financial Scores ----
export interface FinancialScores {
  financialFreedom: number    // 0-100
  creditHealth: number        // 0-100
  businessHealth: number      // 0-100
  dataQuality: number         // 0-100
  overall: number             // 0-100
}

// ---- API Response types ----
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
