'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard',   icon: '📊', label: 'Dashboard' },
  { href: '/cashflow',    icon: '💸', label: 'Cash Flow' },
  { href: '/credit',      icon: '📈', label: 'Credit' },
  { href: '/businesses',  icon: '🏢', label: 'Businesses' },
  { href: '/documents',   icon: '📁', label: 'Documents' },
  { href: '/loops',       icon: '🔁', label: 'Open Loops' },
  { href: '/journal',     icon: '📓', label: 'Journal' },
  { href: '/ai',          icon: '🤖', label: 'AI CFO' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-60 flex-shrink-0 bg-[#111827] border-r border-[#1f2937] flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[#1f2937]">
        <span className="text-xl mr-2">⚡</span>
        <span className="font-bold text-white text-sm leading-tight">
          Kojo<br/><span className="text-[#00e5b0] font-black">Financial OS</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-[#00e5b0]/10 text-[#00e5b0] border border-[#00e5b0]/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-[#1f2937]">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <span>⚙️</span> Settings
        </Link>
      </div>
    </aside>
  )
}
