import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const sql = neon(process.env.DATABASE_URL)

const NEW_PASSWORD = 'KojoFOS2026!'
const hash = await bcrypt.hash(NEW_PASSWORD, 12)

// Check if user exists
const users = await sql`SELECT id, email FROM "User" WHERE email = 'damokllc@gmail.com'`
console.log('Users found:', users.length, users.map(u => u.email))

if (users.length === 0) {
  // Create user if missing
  await sql`
    INSERT INTO "User" (id, email, name, "passwordHash", "createdAt", "updatedAt")
    VALUES (
      'user_kojo_001',
      'damokllc@gmail.com',
      'Kojo Oppon-Kusi',
      ${hash},
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET "passwordHash" = ${hash}, "updatedAt" = NOW()
  `
  console.log('✅ User created and password set')
} else {
  await sql`UPDATE "User" SET "passwordHash" = ${hash}, "updatedAt" = NOW() WHERE email = 'damokllc@gmail.com'`
  console.log('✅ Password reset in database')
}

console.log('📧 Email: damokllc@gmail.com')
console.log('🔑 Password: KojoFOS2026!')
console.log('🔒 Hash:', hash)
