import type { NextAuthConfig } from 'next-auth'

/**
 * Lightweight auth config for Next.js middleware (Edge runtime).
 * Must NOT import Node.js-only modules (bcrypt, neon, prisma, etc.).
 * The full provider config lives in ./config.ts and runs server-side only.
 */
export const middlewareAuthConfig: NextAuthConfig = {
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthRoute = nextUrl.pathname.startsWith('/auth')

      if (isAuthRoute) {
        // Redirect logged-in users away from auth pages
        if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl))
        return true
      }

      // All other routes require authentication
      return isLoggedIn
    },
  },
  providers: [], // No providers here — Edge runtime can't run bcrypt/DB
}
