'use server'

import { z } from 'zod'
import { sql } from '@/lib/db/neon'
import { createResetToken } from '@/lib/auth/password-reset'
import { isEmailConfigured, sendEmail } from '@/lib/email'

export type ForgotState = { ok?: boolean; message?: string } | undefined

const GENERIC = 'If that email belongs to an account, a reset link is on its way. It works for 30 minutes.'
const COOLDOWN_MS = 60 * 1000
const lastSent = new Map<string, number>()

function appBaseUrl(): string | null {
  const url = process.env.APP_BASE_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL
  return url ? url.replace(/\/$/, '') : null
}

export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = z.string().email().safeParse(String(formData.get('email') || '').trim().toLowerCase())
  if (!parsed.success) return { message: 'Enter a valid email address.' }
  const email = parsed.data

  if (!isEmailConfigured() || !appBaseUrl()) {
    console.error('[reset] email or APP_BASE_URL not configured')
    return { message: 'Password reset email is not set up on this server yet.' }
  }

  const last = lastSent.get(email) ?? 0
  if (Date.now() - last < COOLDOWN_MS) return { ok: true, message: GENERIC }

  try {
    const rows = await sql`
      SELECT id, email, "passwordHash" FROM "User" WHERE email = ${email} LIMIT 1
    `
    const user = rows[0] as { id: string; email: string; passwordHash: string } | undefined
    if (user?.passwordHash) {
      lastSent.set(email, Date.now())
      const token = createResetToken(user.id, user.passwordHash)
      const link = `${appBaseUrl()}/auth/reset?token=${encodeURIComponent(token)}`
      await sendEmail({
        to: user.email,
        subject: 'Reset your Kojo Financial OS password',
        text:
          `Someone (hopefully you) asked to reset your Kojo Financial OS password.\n\n` +
          `Open this link within 30 minutes to choose a new password:\n${link}\n\n` +
          `If you didn't ask for this, ignore this email — your password stays the same.`,
        html:
          `<p>Someone (hopefully you) asked to reset your Kojo Financial OS password.</p>` +
          `<p><a href="${link}">Choose a new password</a> — the link works for 30 minutes and only once.</p>` +
          `<p>If you didn't ask for this, ignore this email — your password stays the same.</p>`,
      })
      sql`INSERT INTO "AuditLog" (id, "userId", action, entity, "createdAt")
          VALUES (${'al_' + Date.now().toString(36)}, ${user.id}, 'PASSWORD_RESET_REQUESTED', 'User', NOW())`.catch(() => {})
    }
  } catch (err) {
    console.error('[reset] request failed:', (err as Error).message)
    return { message: 'Could not send the email right now. Try again in a minute.' }
  }

  return { ok: true, message: GENERIC }
}
