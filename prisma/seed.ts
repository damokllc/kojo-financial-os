import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Kojo Financial OS...')

  const passwordHash = await bcrypt.hash('KojoFOS2026!', 12)
  const user = await db.user.upsert({
    where: { email: 'damokllc@gmail.com' },
    update: {},
    create: {
      email: 'damokllc@gmail.com',
      name: 'Kojo Oppon-Kusi',
      passwordHash,
      profile: {
        create: {
          preferredName: 'Kojo',
          financialGoal: 'Financial freedom by 2027',
        },
      },
    },
  })
  console.log(`✅ User: ${user.email}`)

  await db.financialAccount.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, name: 'Cash on Hand', type: 'OTHER', balance: 200, currency: 'USD', isActive: true, dataStatus: 'USER_PROVIDED' },
      { userId: user.id, name: 'Checking (approx)', type: 'CHECKING', balance: 0, currency: 'USD', isActive: true, dataStatus: 'ESTIMATED' },
    ],
  })
  console.log('✅ Financial accounts')

  await db.debt.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: user.id,
        creditor: 'Car Loan',
        type: 'AUTO_LOAN',
        currentBalance: 10500,
        originalBalance: 12000,
        apr: 10.99,
        minimumPayment: 350,
        dataStatus: 'USER_PROVIDED',
      },
    ],
  })
  console.log('✅ Debts')

  await db.openLoop.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, text: 'Enroll in ACA health insurance', priority: 'CRITICAL', status: 'PENDING', dueDate: new Date('2026-09-10'), nextAction: 'Visit healthcare.gov' },
      { userId: user.id, text: 'Get auto insurance quote', priority: 'CRITICAL', status: 'PENDING', dueDate: new Date('2026-09-07'), nextAction: 'Call Geico / Progressive' },
      { userId: user.id, text: 'Apply for Discover Secured Credit Card', priority: 'HIGH', status: 'PENDING', dueDate: new Date('2026-09-15'), nextAction: 'Apply at discover.com/credit-cards/secured' },
      { userId: user.id, text: 'Register music catalog with ASCAP or BMI', priority: 'HIGH', status: 'PENDING', nextAction: 'Compare ASCAP vs BMI royalty rates' },
      { userId: user.id, text: 'Get WISP equipment quotes from Wavelink / TP-Link', priority: 'MEDIUM', status: 'PENDING', nextAction: 'Email vendors for tower equipment pricing' },
      { userId: user.id, text: 'Close DraftKings account permanently', priority: 'CRITICAL', status: 'PENDING', nextAction: 'Login and submit account closure request' },
    ],
  })
  console.log('✅ Open loops')

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
  console.log('✅ Businesses')

  await db.decision.create({
    data: {
      userId: user.id,
      decision: 'Build Kojo Financial OS as PWA + production app',
      situation: 'Need a central command center for finances, credit, businesses, and AI CFO',
      expectedOutcome: 'Full financial visibility and AI-powered decision support by Q4 2026',
    },
  })
  console.log('✅ Decision')

  console.log('')
  console.log('🎉 Seed complete!')
  console.log('📧 Email: damokllc@gmail.com')
  console.log('🔑 Password: KojoFOS2026!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
