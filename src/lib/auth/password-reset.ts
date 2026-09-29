import crypto from 'crypto'

/**
 * Stateless password-reset tokens.
 *
 * token = base64url("<userId>.<expiresAtMs>") + "." + HMAC-SHA256(secret, userId.exp.currentPasswordHash)
 *
 * - Expires after RESET_TOKEN_TTL_MS.
 * - Single use: the signature includes the user's current password hash, so the
 *   token stops working the moment the password is changed.
 * - No database table needed.
 */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function sign(userId: string, exp: number, passwordHash: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`reset:${userId}.${exp}.${passwordHash}`)
    .digest('base64url')
}

export function createResetToken(userId: string, passwordHash: string, now = Date.now()): string {
  const exp = now + RESET_TOKEN_TTL_MS
  const payload = Buffer.from(`${userId}.${exp}`, 'utf8').toString('base64url')
  return `${payload}.${sign(userId, exp, passwordHash)}`
}

/** Reads the user id and expiry without checking the signature. */
export function parseResetToken(token: string): { userId: string; exp: number; sig: string } | null {
  if (typeof token !== 'string' || token.length > 512) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  let decoded: string
  try {
    decoded = Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
  const dot = decoded.lastIndexOf('.')
  if (dot <= 0) return null
  const userId = decoded.slice(0, dot)
  const exp = Number(decoded.slice(dot + 1))
  if (!userId || !Number.isFinite(exp)) return null
  return { userId, exp, sig }
}

/** Full check: signature matches the user's current password hash and the token hasn't expired. */
export function verifyResetToken(token: string, passwordHash: string, now = Date.now()): boolean {
  const parsed = parseResetToken(token)
  if (!parsed) return false
  if (now > parsed.exp) return false
  const expected = Buffer.from(sign(parsed.userId, parsed.exp, passwordHash))
  const given = Buffer.from(parsed.sig)
  if (expected.length !== given.length) return false
  return crypto.timingSafeEqual(expected, given)
}
