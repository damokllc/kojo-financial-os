import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Kojo Financial OS...')

  // Create user
  const passwordHash = await bcrypt.hash('KojoFOS2026!', 12)
  const user = await db.user.upsert({
    where: { email: 'damokllc@gmail.com' },
    update: {},
    create: {
      email: 'damokllc@gmail.com',
      name: 'Kojo Oppon-Kusi',
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
      profile: {
        create: {
          displayName: 'Kojo',
          timezone: 'America/New_York',
          financialFreedomTarget: 10000,
          financialFreedomDate: new Date('2027-12-31'),
        },
      },
    },
  })
  console.log(`✅ User: ${user.email}`)

  // Financial accounts
  await db.financialAccount.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, name: 'Cash on Hand', accountType: 'CASH', balance: 200, currency: 'USD', isActive: true, dataStatus: 'USER_PROVIDED' },
      { userId: user.id, name: 'Checking (approx)', accountType: 'CHECKING', balance: 0, currency: 'USD', isActive: true, dataStatus: 'ESTIMATED' },
    ],
  })

  // Car loan debt
  await db.debt.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: user.id,
        name: 'Car Loan',
        debtType: 'AUTO',
        currentBalance: 10500,
        originalBalance: 12000,
        interestRate: 10.99,
        minimumPayment: 350,
        isActive: true,
        dataStatus: 'USER_PROVIDED',
      },
    ],
  })

  // Open loops
  await db.openLoop.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, text: 'Enroll in ACA health insurance', priority: 'CRITICAL', status: 'PENDING', deadline: new Date('2026-09-10'), nextAction: 'Visit healthcare.gov', category: 'Insurance' },
      { userId: user.id, text: 'Get auto insurance quote', priority: 'CRITICAL', status: 'PENDING', deadline: new Date('2026-09-07'), nextAction: 'Call Geico / Progressive', category: 'Insurance' },
      { userId: user.id, text: 'Apply for Discover Secured Credit Card', priority: 'HIGH', status: 'PENDING', deadline: new Date('2026-09-15'), nextAction: 'Apply at discover.com/credit-cards/secured', category: 'Credit' },
      { userId: user.id, text: 'Register music catalog with ASCAP or BMI', priority: 'HIGH', status: 'PENDING', nextAction: 'Compare ASCAP vs BMI royalty rates', category: 'Business' },
      { userId: user.id, text: 'Get WISP equipment quotes from Wavelink / TP-Link', priority: 'MEDIUM', status: 'PENDING', nextAction: 'Email vendors for tower equipment pricing', category: 'Business' },
      { userId: user.id, text: 'Close DraftKings account permanently', priority: 'CRITICAL', status: 'PENDING', nextAction: 'Login and submit account closure request', category: 'Financial Health' },
    ],
  })

  // Businesses
  await db.business.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, name: 'Wonderland Entertainment', grade: 'B', description: 'Events and entertainment', isActive: true },
      { userId: user.id, name: 'WISP (Wireless ISP)', grade: 'C', description: 'Rural internet service provider concept', isActive: true },
      { userId: user.id, name: 'Wondacoin', grade: 'C', description: 'Crypto / token project', isActive: true },
      { userId: user.id, name: 'Music Catalog (Royalties)', grade: 'B', description: 'ASCAP/BMI royalty income stream', isActive: true },
      { userId: user.id, name: 'Vending Machine Route', grade: 'B', description: 'Passive income vending route', isActive: true },
      { userId: user.id, name: 'DraftKings / Gambling', grade: 'E', description: 'Distraction — close account', isActive: true },
    ],
  })

  // Seed decision
  await db.decision.create({
    data: {
      userId: user.id,
      decision: 'Build Kojo Financial OS as PWA + production app',
      context: 'Need a central command center for finances, credit, businesses, and AI CFO',
      expectedOutcome: 'Full financial visibility and AI-powered decision support by Q4 2026',
      tags: ['infrastructure', 'tech', 'long-term'],
    },
  })

  console.log('✅ Seed complete — Kojo Financial OS ready')
  console.log('📧 Email: damokllc@gmail.com')
  console.log('🔑 Password: KojoFOS2026!')
  console.log('⚠️  Change password after first login!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
