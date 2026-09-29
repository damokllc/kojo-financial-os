'use client'

import Link from 'next/link'
import { Suspense, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { authenticate } from './actions'

function ResetNotice() {
  const params = useSearchParams()
  if (params.get('reset') !== '1') return null
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-lg px-4 py-3 mb-5">
      Password updated. Sign in with your new password.
    </div>
  )
}

function SignInButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Signing in…' : 'Sign In'}
    </button>
  )
}

export default function SignInPage() {
  const [errorMessage, dispatch] = useActionState(authenticate, undefined)

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-white">Kojo Financial OS</h1>
          <p className="text-slate-400 mt-1 text-sm">Your AI-powered CFO. Sign in to continue.</p>
        </div>

        {/* Card */}
        <div className="card">
          <Suspense fallback={null}>
            <ResetNotice />
          </Suspense>
          <form action={dispatch} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full bg-[#111827] border border-[#2a3040] rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00e5b0] focus:ring-1 focus:ring-[#00e5b0] transition-colors"
                placeholder="kojo@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <Link href="/auth/forgot" className="text-xs text-[#00e5b0] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-[#111827] border border-[#2a3040] rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00e5b0] focus:ring-1 focus:ring-[#00e5b0] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                {errorMessage}
              </div>
            )}

            <SignInButton />
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Kojo Financial OS · Private · Secure · Encrypted
        </p>
      </div>
    </main>
  )
}
