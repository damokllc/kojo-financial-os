// Run from project root: node --env-file=.env.local fix-enum.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const existing = await sql`
  SELECT enumlabel FROM pg_enum e 
  JOIN pg_type t ON e.enumtypid = t.oid 
  WHERE t.typname = 'MemoryCategory'
`;
console.log('Current enum values:', existing.map(r => r.enumlabel));

const hasWeeklyReview = existing.some(r => r.enumlabel === 'WEEKLY_REVIEW');
if (!hasWeeklyReview) {
  await sql`ALTER TYPE "MemoryCategory" ADD VALUE 'WEEKLY_REVIEW'`;
  console.log('✅ Added WEEKLY_REVIEW to MemoryCategory — database fixed!');
} else {
  console.log('✅ WEEKLY_REVIEW already exists — no action needed');
}
