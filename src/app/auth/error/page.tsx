'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const ERRORS: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired: 'Please sign in to continue.',
  Default: 'An authentication error occurred.',
}

function ErrorContent() {
  const params = useSearchParams()
  const error = params.get('error') ?? 'Default'
  const message = ERRORS[error] ?? ERRORS.Default

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-white mb-2">Sign In Failed</h1>
        <p className="text-slate-400 mb-6">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-block px-6 py-2.5 bg-[#00e5b0] text-black font-medium rounded-lg hover:bg-[#00c99a] transition-colors"
        >
          Try Again
        </Link>
      </div>
    </main>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  )
}
