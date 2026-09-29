'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { requestPasswordReset } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Sending…' : 'Email me a reset link'}
    </button>
  )
}

export default function ForgotPasswordPage() {
  const [state, dispatch] = useActionState(requestPasswordReset, undefined)

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="text-slate-400 mt-1 text-sm">We&apos;ll email you a link to choose a new one.</p>
        </div>

        <div className="card">
          {state?.ok ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-lg px-4 py-3">
              {state.message}
            </div>
          ) : (
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

              {state?.message && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                  {state.message}
                </div>
              )}

              <SubmitButton />
            </form>
          )}
        </div>

        <p className="text-center text-sm mt-6">
          <Link href="/auth/signin" className="text-[#00e5b0] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
