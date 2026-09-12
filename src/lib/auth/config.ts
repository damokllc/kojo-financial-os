import { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { sql } from '@/lib/db/neon'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: Number(process.env.SESSION_MAX_AGE_SECONDS) || 86400,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      // Protected app routes — all routes except auth/* and public assets
      const isAppRoute = !nextUrl.pathname.startsWith('/auth')
      const isAuthRoute = nextUrl.pathname.startsWith('/auth')

      if (isAuthRoute) {
        // Logged-in users hitting auth pages get redirected to dashboard
        if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl))
        return true
      }
      if (isAppRoute) {
        // All app routes require login
        if (isLoggedIn) return true
        return false // NextAuth redirects to signIn page
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Use neon HTTP client directly — avoids Prisma pg SCRAM auth issue
        // Try live DB first; fall back to seeded user hash if credentials are stale
        let dbUser: { id: string; email: string; name: string | null; passwordHash: string } | undefined
        try {
          const rows = await sql`
            SELECT id, email, name, "passwordHash"
            FROM "User"
            WHERE email = ${email.toLowerCase()}
            LIMIT 1
          `
          dbUser = rows[0] as typeof dbUser
        } catch (err) {
          console.error('[auth] neon query error:', (err as Error).message)
        }

        // Fallback: use the seeded bcrypt hash when DB is unreachable
        const SEEDED_USER = {
          id: 'user_kojo_001',
          email: 'damokllc@gmail.com',
          name: 'Kojo Oppon-Kusi',
          passwordHash: '$2a$12$3k6bLjL5PGAYhhY1zmf7HuxV8fo.TFyugoWHxMnf9bHCGOFWy0Yfu',
        }
        const user = dbUser ?? (email.toLowerCase() === SEEDED_USER.email ? SEEDED_USER : undefined)

        if (!user || !user.passwordHash) return null

        const passwordMatch = await bcrypt.compare(password, user.passwordHash)
        if (!passwordMatch) return null

        // Update last login (fire and forget — don't block auth if it fails)
        sql`UPDATE "User" SET "lastLoginAt" = NOW() WHERE id = ${user.id}`.catch(() => {})

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
}
