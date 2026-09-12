'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Review {
  key: string
  value: string
  updatedAt: string
}

function formatReviewDate(key: string) {
  const d = new Date(key + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function parseReviewSections(text: string) {
  // Split by numbered section headers like "1. WEEK IN REVIEW"
  const sectionPattern = /(\d+\.\s+[A-Z][A-Z\s]+(?:—[^\n]*)?)\n/g
  const parts: { header: string; body: string }[] = []
  let lastIndex = 0
  let match

  const matches: { index: number; header: string }[] = []
  while ((match = sectionPattern.exec(text)) !== null) {
    matches.push({ index: match.index, header: match[1].trim() })
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].header.length + 1
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length
    parts.push({ header: matches[i].header, body: text.slice(start, end).trim() })
  }

  if (parts.length === 0) return [{ header: '', body: text }]
  return parts
}

const SECTION_ICONS: Record<string, string> = {
  '1': '📅',
  '2': '🎯',
  '3': '💰',
  '4': '🏢',
  '5': '🔁',
  '6': '🚀',
  '7': '⚠️',
  '8': '⭐',
}

const SECTION_COLORS: Record<string, string> = {
  '1': 'border-blue-500/40 bg-blue-500/5',
  '2': 'border-emerald-500/40 bg-emerald-500/5',
  '3': 'border-cyan-500/40 bg-cyan-500/5',
  '4': 'border-violet-500/40 bg-violet-500/5',
  '5': 'border-yellow-500/40 bg-yellow-500/5',
  '6': 'border-green-500/40 bg-green-500/5',
  '7': 'border-red-500/40 bg-red-500/5',
  '8': 'border-orange-500/40 bg-orange-500/5',
}

export default function ReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/review')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setReviews(data.reviews ?? [])
    } catch {
      setError('Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  async function generateReview() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/review/generate', { method: 'POST' })
      if (!res.ok) throw new Error('Generation failed')
      await fetchReviews()
      setActiveIndex(0)
    } catch {
      setError('Failed to generate review. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  const currentReview = reviews[activeIndex]
  const sections = currentReview ? parseReviewSections(currentReview.value) : []

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-white/10 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">← Dashboard</Link>
            <span className="text-gray-600">|</span>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-blue-400">⚡</span> AXIOM Weekly Review
              </h1>
              <p className="text-xs text-gray-400">Your financial intelligence briefing</p>
            </div>
          </div>
          <button
            onClick={generateReview}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating…
              </>
            ) : '⟳ Generate Now'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Week selector */}
        {reviews.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {reviews.map((r, i) => (
              <button
                key={r.key}
                onClick={() => setActiveIndex(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  i === activeIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {i === 0 ? '📅 This Week' : formatReviewDate(r.key).split(',')[0]}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading reviews…
          </div>
        )}

        {!loading && reviews.length === 0 && !error && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-white mb-2">No reviews yet</h2>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              Generate your first AXIOM Weekly Review — a full briefing on where you stand and the 3 moves that matter most this week.
            </p>
            <button
              onClick={generateReview}
              disabled={generating}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating…' : '⚡ Generate My First Review'}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {currentReview && (
          <>
            {/* Meta bar */}
            <div className="flex items-center justify-between mb-6 text-sm">
              <div>
                <p className="text-white font-medium">{formatReviewDate(currentReview.key)}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Generated {new Date(currentReview.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <span className="px-2 py-1 rounded bg-blue-600/20 text-blue-400 text-xs font-medium">AI Generated</span>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {sections.map((section, idx) => {
                const numMatch = section.header.match(/^(\d+)/)
                const num = numMatch ? numMatch[1] : String(idx + 1)
                const icon = SECTION_ICONS[num] ?? '📌'
                const colorClass = SECTION_COLORS[num] ?? 'border-white/10 bg-white/5'

                return (
                  <div key={idx} className={`rounded-xl border p-5 ${colorClass}`}>
                    {section.header && (
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <span>{icon}</span>
                        <span>{section.header.replace(/^\d+\.\s+/, '')}</span>
                      </h3>
                    )}
                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {section.body}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer CTA */}
            <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <p className="text-sm text-gray-400">Ready to act on this? Talk to AXIOM.</p>
              <Link
                href="/ai"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Open AXIOM AI →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
