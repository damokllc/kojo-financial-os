import NextAuth from 'next-auth'
import { middlewareAuthConfig } from '@/lib/auth/middleware-config'

export const { auth: middleware } = NextAuth(middlewareAuthConfig)

export default middleware

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
}
