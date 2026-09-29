// Emergency password reset for Kojo Financial OS (use if the email link isn't available).
//
// Run on a machine that has the app's DATABASE_URL, e.g. on wondahub:
//   cd ~/projects/kojo-financial-os && node --env-file=.env scripts/reset-password.mjs damokllc@gmail.com
// You'll be asked for the new password; it is never printed or saved in this file.
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import readline from 'node:readline'

const email = (process.argv[2] || '').trim().toLowerCase()
if (!email) {
  console.error('Usage: node --env-file=.env scripts/reset-password.mjs <email>')
  process.exit(1)
}
const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set (use --env-file=.env)')
  process.exit(1)
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s) }
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer) })
  })
}

const pw1 = await askHidden('New password: ')
const pw2 = await askHidden('Repeat new password: ')
if (pw1 !== pw2) { console.error('Passwords do not match — nothing changed.'); process.exit(1) }
if (pw1.length < 10) { console.error('Use at least 10 characters — nothing changed.'); process.exit(1) }

const sql = neon(url)
const hash = await bcrypt.hash(pw1, 12)
const rows = await sql`UPDATE "User" SET "passwordHash" = ${hash}, "updatedAt" = NOW() WHERE email = ${email} RETURNING email`
if (rows.length === 0) { console.error(`No user with email ${email} — nothing changed.`); process.exit(1) }
console.log(`✅ Password updated for ${rows[0].email}`)
