# Kojo Financial OS — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

## 1. Install dependencies
```bash
npm install
```

## 2. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `NEXTAUTH_SECRET` — run: `openssl rand -base64 32`
- `AUTH_SECRET` — same or different: `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `ENCRYPTION_KEY` — run: `openssl rand -hex 32`

## 3. Set up database
```bash
npm run db:migrate    # creates tables from schema.prisma
npm run db:seed       # seeds your user + initial data
```

## 4. Run development server
```bash
npm run dev
```
Open http://localhost:3000

**Login:**
- Email: `damokllc@gmail.com`
- Password: `KojoFOS2026!`
- ⚠️ Change password in Settings after first login

## 5. Optional: Database UI
```bash
npm run db:studio     # opens Prisma Studio at localhost:5555
```

---

## Project Structure
```
src/
├── app/                  # Next.js App Router pages
│   ├── api/ai/chat/      # AI CFO streaming endpoint
│   ├── api/auth/         # NextAuth handlers
│   ├── ai/               # AI CFO chat page
│   └── dashboard/        # Main dashboard
├── components/
│   ├── dashboard/        # Dashboard widgets
│   └── layout/           # Sidebar + TopBar
├── lib/
│   ├── ai/context.ts     # getFinancialContext() — AI system prompt
│   ├── auth/             # NextAuth v5 config
│   ├── db/client.ts      # Prisma singleton
│   └── crypto.ts         # AES-256 encryption for sensitive fields
└── types/index.ts        # Core TypeScript types
prisma/
├── schema.prisma         # 25+ models, full financial schema
└── seed.ts               # Initial data seed
```

## What's Built (Phase 1)
- [x] Full database schema (25+ models)
- [x] NextAuth v5 authentication
- [x] Protected dashboard with sidebar nav
- [x] Net Worth, Cash Flow, Credit Score cards
- [x] Open Loops widget
- [x] Business Portfolio grade widget
- [x] AI CFO streaming chat (claude-sonnet-4-5)
- [x] Quick prompt shortcuts
- [x] AES-256 encryption utility
- [x] Security headers (CSP, X-Frame-Options, etc.)
- [x] Database seed with Kojo's real data

## Next Phases
- [ ] Phase 2: Cash flow — transactions, categories, monthly trends
- [ ] Phase 3: Credit — report upload, PDF parsing, dispute tracking
- [ ] Phase 4: Document vault — encrypted storage
- [ ] Phase 5: Business portfolio — scoring engine
- [ ] Phase 6: Scenario engine — forecasting, stress testing
