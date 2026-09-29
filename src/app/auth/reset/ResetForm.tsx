'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { resetPassword } from './actions'

const inputClass =
  'w-full bg-[#111827] border border-[#2a3040] rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00e5b0] focus:ring-1 focus:ring-[#00e5b0] transition-colors'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : 'Set new password'}
    </button>
  )
}

export default function ResetForm({ token }: { token: string }) {
  const [state, dispatch] = useActionState(resetPassword, undefined)

  return (
    <form action={dispatch} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className={inputClass}
          placeholder="At least 10 characters"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
          Confirm new password
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
      </div>

      {state?.message && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {state.message}
        </div>
      )}

      <SubmitButton />
    </form>
  )
}
