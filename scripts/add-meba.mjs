// One-off: register the MEBA project (app, Meba World, Mi Meba shop) in AXIOM,
// add its goals and open loops, and close the finished auto-insurance loop.
// Safe to re-run: anything that already exists (matched by name/text) is skipped.
//
// On wondahub:
//   cd ~/projects/kojo-financial-os && node --env-file=.env scripts/add-meba.mjs damokllc@gmail.com
import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const email = (process.argv[2] || '').trim().toLowerCase()
const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL
if (!email || !url) {
  console.error('Usage: node --env-file=.env scripts/add-meba.mjs <email>')
  process.exit(1)
}
const sql = neon(url)
const id = (p) => `${p}_${crypto.randomBytes(10).toString('hex')}`

const [user] = await sql`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`
if (!user) { console.error(`No user ${email}`); process.exit(1) }
const uid = user.id

// ── Businesses ────────────────────────────────────────────────────────────────
const businesses = [
  {
    name: 'MEBA App',
    type: 'Tech — Damok LLC (Chapel Eight: Tech/Network arm)',
    industry: 'Consumer AI / mobile app',
    grade: 'D', stage: 3, priority: 'P2',
    description: 'MEBA companion AI Android app + backend. Features working in emulator: registration, login, chat, memory, profile, MEBA World, avatar.',
    notes: 'Repos: damokllc/meba2-android, damokllc/meba-backend (last commits 2026-09-26). Next: real-phone test (Windows Firewall blocker on IAMWONDA), decide revenue model (subscription / credits), Play Store listing. Links: Meba World content drives installs; in-app MEBA World credits can sell Mi Meba merch.',
  },
  {
    name: 'Meba World (Shorts)',
    type: 'Media — Wonda Media / 1405 Entertainment (Chapel Eight: Media arm)',
    industry: 'Short-form video content',
    grade: 'D', stage: 2, priority: 'P2',
    description: 'Daily Meba World story Shorts for YouTube / TikTok / Instagram, generated with Higgsfield, posted ~8am ET.',
    notes: 'Costs: Higgsfield Starter plan (~13 credits/video, ~91/week needed vs ~46 available) — enter the monthly fee in expenses. Several daily runs failing at startup. Role: audience + traffic engine for Mi Meba shop and MEBA app.',
  },
  {
    name: 'Mi Meba Shop',
    type: 'E-commerce (Chapel Eight: E-commerce arm)',
    industry: 'Merch / lifestyle products',
    grade: 'D', stage: 2, priority: 'P3',
    description: 'Shopify store: MEBA Body Oil, Signature Tee, Gold Chain. Weekly featured-product rotation feeds the content pipeline.',
    notes: '0 orders so far; store still titled "My Store". Enter Shopify plan fee in expenses. Revenue should be linked from Shopify later (live data).',
  },
]

for (const b of businesses) {
  const existing = await sql`SELECT id FROM "Business" WHERE "userId" = ${uid} AND lower(name) = lower(${b.name}) LIMIT 1`
  if (existing.length) { console.log(`• Business exists, skipped: ${b.name}`); continue }
  await sql`
    INSERT INTO "Business" (id, "userId", name, type, industry, grade, stage, priority, "projectState",
      description, notes, country, "isActive", "dataStatus", "createdAt", "updatedAt")
    VALUES (${id('biz')}, ${uid}, ${b.name}, ${b.type}, ${b.industry}, ${b.grade}::"BusinessGrade", ${b.stage},
      ${b.priority}, 'ACTIVE', ${b.description}, ${b.notes}, 'US', true, 'USER_PROVIDED', NOW(), NOW())`
  console.log(`✅ Business added: ${b.name}`)
}

// ── Goals ─────────────────────────────────────────────────────────────────────
const goals = [
  { title: 'MEBA App: first 100 real users', category: 'business', priority: 'HIGH', targetDate: '2026-12-31',
    notes: 'Requires real-phone test, Play Store listing, and Meba World driving installs.' },
  { title: 'Mi Meba Shop: first sale', category: 'business', priority: 'HIGH', targetDate: '2026-11-15', targetAmount: 1,
    notes: 'Link products from daily Shorts; rename store from "My Store".' },
  { title: 'Meba World: 30 days of posts without a failed run', category: 'business', priority: 'MEDIUM', targetDate: '2026-11-30',
    notes: 'Fix startup failures and Higgsfield credit budget first.' },
]
for (const g of goals) {
  const existing = await sql`SELECT id FROM "Goal" WHERE "userId" = ${uid} AND lower(title) = lower(${g.title}) LIMIT 1`
  if (existing.length) { console.log(`• Goal exists, skipped: ${g.title}`); continue }
  await sql`
    INSERT INTO "Goal" (id, "userId", title, category, "targetAmount", "targetDate", status, priority, notes, "createdAt", "updatedAt")
    VALUES (${id('goal')}, ${uid}, ${g.title}, ${g.category}, ${g.targetAmount ?? null}, ${g.targetDate}, 'active',
      ${g.priority}, ${g.notes}, NOW(), NOW())`
  console.log(`✅ Goal added: ${g.title}`)
}

// ── Open loops ────────────────────────────────────────────────────────────────
const loops = [
  { text: 'MEBA App: test on a real phone', priority: 'HIGH', due: '2026-10-10',
    next: 'Fix Windows Firewall / network profile on IAMWONDA so the phone can reach the backend over Wi-Fi.' },
  { text: 'MEBA App: choose revenue model', priority: 'MEDIUM', due: '2026-10-31',
    next: 'Decide subscription vs credits vs free + merch; note it on the MEBA App business.' },
  { text: 'Meba World: fix failing daily Story Short runs', priority: 'HIGH', due: '2026-10-07',
    next: 'Find why runs fail at startup; cover ~91 Higgsfield credits/week or cut frequency.' },
  { text: 'Mi Meba Shop: rename store and link products from Shorts', priority: 'MEDIUM', due: '2026-10-15',
    next: 'Store is still titled "My Store"; add product links to video captions/bio.' },
]
for (const l of loops) {
  const existing = await sql`SELECT id FROM "OpenLoop" WHERE "userId" = ${uid} AND lower(text) = lower(${l.text}) LIMIT 1`
  if (existing.length) { console.log(`• Open loop exists, skipped: ${l.text}`); continue }
  await sql`
    INSERT INTO "OpenLoop" (id, "userId", text, priority, status, "nextAction", "dueDate", category, source, "createdAt", "updatedAt")
    VALUES (${id('loop')}, ${uid}, ${l.text}, ${l.priority}::"Priority", 'OPEN'::"TaskStatus", ${l.next}, ${l.due},
      'MEBA', 'claude-cowork-2026-09-29', NOW(), NOW())`
  console.log(`✅ Open loop added: ${l.text}`)
}

// ── Close the finished auto-insurance loop ────────────────────────────────────
const closed = await sql`
  UPDATE "OpenLoop" SET status = 'DONE'::"TaskStatus", "closedAt" = NOW(),
    "closedNote" = 'Auto insurance obtained (Kojo, 2026-09-29)', "updatedAt" = NOW()
  WHERE "userId" = ${uid} AND text ILIKE '%auto insurance%' AND status NOT IN ('DONE','CANCELLED')
  RETURNING text`
for (const r of closed) console.log(`✅ Closed: ${r.text}`)

console.log('Done. Refresh the AXIOM dashboard.')
