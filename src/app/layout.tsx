import type { Metadata, Viewport } from 'next'
import './globals.css'
import { auth } from '@/lib/auth'
import { SessionProvider } from 'next-auth/react'

export const metadata: Metadata = {
  title: { default: 'Kojo Financial OS', template: '%s | Kojo Financial OS' },
  description: 'Your AI-powered personal CFO and financial operating system',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  keywords: ['finance', 'CFO', 'AI', 'credit', 'business', 'wealth'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00e5b0',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-[#0a0a0a] text-slate-100 min-h-screen">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
