-- ============================================================
-- KOJO FINANCIAL OS - Seed Data
-- Run AFTER 01_schema.sql
-- Login: damokllc@gmail.com  password: KojoFOS2026!
-- ============================================================

-- User
INSERT INTO "User" ("id","email","passwordHash","name","createdAt","updatedAt")
VALUES (
  'user_kojo_001',
  'damokllc@gmail.com',
  '$2a$12$3k6bLjL5PGAYhhY1zmf7HuxV8fo.TFyugoWHxMnf9bHCGOFWy0Yfu',
  'Kojo Oppon-Kusi',
  NOW(), NOW()
)
ON CONFLICT ("email") DO NOTHING;

-- Profile
INSERT INTO "Profile" ("id","userId","preferredName","financialGoal","createdAt","updatedAt")
VALUES (
  'prof_kojo_001',
  'user_kojo_001',
  'Kojo',
  'Financial freedom by 2027',
  NOW(), NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- Financial Accounts
INSERT INTO "FinancialAccount" ("id","userId","name","type","balance","currency","isActive","dataStatus","createdAt","updatedAt")
VALUES
  ('acct_cash_001',   'user_kojo_001', 'Cash on Hand',    'OTHER',    200, 'USD', true, 'USER_PROVIDED', NOW(), NOW()),
  ('acct_chk_001',    'user_kojo_001', 'Checking (approx)','CHECKING',  0,   'USD', true, 'ESTIMATED',     NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Debt
INSERT INTO "Debt" ("id","userId","creditor","type","originalBalance","currentBalance","apr","minimumPayment","dataStatus","createdAt","updatedAt")
VALUES (
  'debt_car_001',
  'user_kojo_001',
  'Car Loan',
  'AUTO_LOAN',
  12000, 10500, 10.99, 350,
  'USER_PROVIDED',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- Open Loops
INSERT INTO "OpenLoop" ("id","userId","text","priority","status","dueDate","nextAction","createdAt","updatedAt")
VALUES
  ('loop_001','user_kojo_001','Enroll in ACA health insurance','CRITICAL','PENDING','2026-09-10','Visit healthcare.gov',NOW(),NOW()),
  ('loop_002','user_kojo_001','Get auto insurance quote','CRITICAL','PENDING','2026-09-07','Call Geico / Progressive',NOW(),NOW()),
  ('loop_003','user_kojo_001','Apply for Discover Secured Credit Card','HIGH','PENDING','2026-09-15','Apply at discover.com/credit-cards/secured',NOW(),NOW()),
  ('loop_004','user_kojo_001','Register music catalog with ASCAP or BMI','HIGH','PENDING',NULL,'Compare ASCAP vs BMI royalty rates',NOW(),NOW()),
  ('loop_005','user_kojo_001','Get WISP equipment quotes from Wavelink / TP-Link','MEDIUM','PENDING',NULL,'Email vendors for tower equipment pricing',NOW(),NOW()),
  ('loop_006','user_kojo_001','Close DraftKings account permanently','CRITICAL','PENDING',NULL,'Login and submit account closure request',NOW(),NOW())
ON CONFLICT DO NOTHING;

-- Businesses
INSERT INTO "Business" ("id","userId","name","grade","description","isActive","createdAt","updatedAt")
VALUES
  ('biz_wonder_001', 'user_kojo_001', 'Wonderland Entertainment',    'B', 'Events and entertainment',            true, NOW(), NOW()),
  ('biz_wisp_001',   'user_kojo_001', 'WISP (Wireless ISP)',          'C', 'Rural internet service provider concept', true, NOW(), NOW()),
  ('biz_wonda_001',  'user_kojo_001', 'Wondacoin',                    'C', 'Crypto / token project',              true, NOW(), NOW()),
  ('biz_music_001',  'user_kojo_001', 'Music Catalog (Royalties)',     'B', 'ASCAP/BMI royalty income stream',     true, NOW(), NOW()),
  ('biz_vend_001',   'user_kojo_001', 'Vending Machine Route',         'B', 'Passive income vending route',        true, NOW(), NOW()),
  ('biz_draft_001',  'user_kojo_001', 'DraftKings / Gambling',         'E', 'Distraction — close account',         true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Decision Journal
INSERT INTO "Decision" ("id","userId","decision","situation","expectedOutcome","createdAt","updatedAt")
VALUES (
  'dec_001',
  'user_kojo_001',
  'Build Kojo Financial OS as PWA + production app',
  'Need a central command center for finances, credit, businesses, and AI CFO',
  'Full financial visibility and AI-powered decision support by Q4 2026',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- Verify seed worked
SELECT 'Users: '    || COUNT(*) FROM "User"         UNION ALL
SELECT 'Profiles: ' || COUNT(*) FROM "Profile"      UNION ALL
SELECT 'Accounts: ' || COUNT(*) FROM "FinancialAccount" UNION ALL
SELECT 'Debts: '    || COUNT(*) FROM "Debt"         UNION ALL
SELECT 'OpenLoops: '|| COUNT(*) FROM "OpenLoop"     UNION ALL
SELECT 'Businesses: '||COUNT(*) FROM "Business"     UNION ALL
SELECT 'Decisions: '|| COUNT(*) FROM "Decision";
