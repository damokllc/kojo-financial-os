'use client'

import { signOut } from 'next-auth/react'
import type { User } from 'next-auth'

export default function TopBar({ user }: { user: User }) {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[#1f2937] bg-[#111827] flex-shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="text-xs text-slate-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-[#2a3040]"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
