'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import { parseResetToken, verifyResetToken } from '@/lib/auth/password-reset'

export type ResetState = { message?: string } | undefined

const EXPIRED = 'This reset link has expired or was already used. Request a new one.'

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get('token') || '')
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')

  if (password.length < 10) return { message: 'Use at least 10 characters.' }
  if (password.length > 200) return { message: 'That password is too long.' }
  if (password !== confirm) return { message: 'The two passwords don’t match.' }

  const parsed = parseResetToken(token)
  if (!parsed) return { message: EXPIRED }

  let user: { id: string; passwordHash: string } | undefined
  try {
    const rows = await sql`SELECT id, "passwordHash" FROM "User" WHERE id = ${parsed.userId} LIMIT 1`
    user = rows[0] as typeof user
  } catch (err) {
    console.error('[reset] lookup failed:', (err as Error).message)
    return { message: 'Could not reach the database. Try again in a minute.' }
  }

  if (!user || !verifyResetToken(token, user.passwordHash)) return { message: EXPIRED }

  const newHash = await bcrypt.hash(password, 12)
  try {
    // Only update if the hash is unchanged since the token was checked (prevents double use).
    const updated = await sql`
      UPDATE "User" SET "passwordHash" = ${newHash}, "updatedAt" = NOW()
      WHERE id = ${user.id} AND "passwordHash" = ${user.passwordHash}
      RETURNING id
    `
    if (updated.length === 0) return { message: EXPIRED }
    sql`INSERT INTO "AuditLog" (id, "userId", action, entity, "createdAt")
        VALUES (${'al_' + Date.now().toString(36)}, ${user.id}, 'PASSWORD_RESET_COMPLETED', 'User', NOW())`.catch(() => {})
  } catch (err) {
    console.error('[reset] update failed:', (err as Error).message)
    return { message: 'Could not save the new password. Try again.' }
  }

  redirect('/auth/signin?reset=1')
}
