'use client'

import { useState } from 'react'
import Link from 'next/link'

const QUICK_PROMPTS = [
  { icon: '☀️', label: 'Morning Brief',    prompt: 'Good morning. Give me my daily CFO briefing — open loops, top priorities, and what to focus on today.' },
  { icon: '🧬', label: 'My DNA',           prompt: 'What does my Financial DNA say about my patterns, strengths, and blindspots?' },
  { icon: '🔁', label: 'Loops Review',     prompt: 'Review my open loops. Which are most urgent and what do I need to do in the next 48 hours?' },
  { icon: '📡', label: 'Opportunities',    prompt: 'What are the 3 highest-value financial opportunities I should pursue in the next 30 days?' },
  { icon: '💳', label: 'Credit Strategy',  prompt: 'Give me a 90-day credit improvement strategy based on my current score and profile.' },
  { icon: '/move', label: '/next-move',    prompt: '/next-move' },
]

export default function QuickAICard() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">🤖 Quick AI CFO</h2>
        <Link href="/ai" className="text-xs text-[#00e5b0] hover:underline">
          Open full chat →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map(p => (
          <Link
            key={p.label}
            href={`/ai?q=${encodeURIComponent(p.prompt)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#2a3040] text-sm text-slate-300 hover:border-[#00e5b0] hover:text-[#00e5b0] transition-all"
          >
            <span>{p.icon}</span> {p.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
