'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

const QUICK_PROMPTS = [
  { icon: '☀️', label: 'Morning Brief',   prompt: 'Good morning. Give me my daily CFO briefing — open loops, top priorities, and what to focus on today.' },
  { icon: '🔁', label: 'Loops Review',    prompt: 'Review my open loops. Which are most urgent and what do I need to do in the next 48 hours?' },
  { icon: '💳', label: 'Credit Strategy', prompt: '/score then give me a 90-day credit improvement plan.' },
  { icon: '📡', label: 'Opportunities',   prompt: 'What are the 3 highest-value financial opportunities I should act on in the next 30 days?' },
  { icon: '⚡', label: '/next-move',      prompt: '/next-move' },
  { icon: '🧬', label: 'My DNA',          prompt: 'What does my Financial DNA say about my patterns, strengths, and blindspots?' },
]

export default function AIChatClient({
  conversationId,
  initialMessages,
  initialPrompt,
}: {
  conversationId: string
  initialMessages: Message[]
  initialPrompt?: string
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState(initialPrompt || '')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sentInitial = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return

    const userMsg: Message = { role: 'user', content, timestamp: new Date().toISOString() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setStreaming(true)

    // Placeholder assistant message
    const assistantMsg: Message = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              accumulated += parsed.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: accumulated }
                return copy
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: '⚠️ Connection error. Please try again.' }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }, [input, messages, streaming, conversationId])

  // Auto-send initial prompt from URL
  useEffect(() => {
    if (initialPrompt && !sentInitial.current && initialMessages.length === 0) {
      sentInitial.current = true
      sendMessage(initialPrompt)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => sendMessage(p.prompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#2a3040] text-sm text-slate-300 hover:border-[#00e5b0] hover:text-[#00e5b0] transition-all"
            >
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">🤖</div>
            <p className="font-medium text-slate-400">Your AI CFO is ready.</p>
            <p className="text-sm mt-1">Ask anything or choose a quick action above.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <span className="w-8 h-8 rounded-full bg-[#00e5b0]/20 border border-[#00e5b0]/30 flex items-center justify-center text-sm mr-3 flex-shrink-0 mt-1">
                🤖
              </span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#00e5b0] text-black font-medium rounded-tr-sm'
                  : 'bg-[#1a1f2e] border border-[#2a3040] text-slate-200 rounded-tl-sm'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 bg-[#00e5b0] ml-1 animate-pulse rounded-sm" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 items-end bg-[#1a1f2e] border border-[#2a3040] rounded-2xl p-3 focus-within:border-[#00e5b0] transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your AI CFO anything… or type a /command"
          rows={1}
          disabled={streaming}
          className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 resize-none focus:outline-none text-sm leading-relaxed max-h-32 disabled:opacity-50"
          style={{ minHeight: '24px' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={streaming || !input.trim()}
          className="btn-primary px-4 py-2 text-sm flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {streaming ? '…' : '→'}
        </button>
      </div>
    </div>
  )
}
