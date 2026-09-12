'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'

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

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}
type SpeechRecognition = any
type SpeechRecognitionEvent = any

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
        li: ({ children }) => <li className="text-slate-200 text-sm">{children}</li>,
        h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-1.5 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-[#00e5b0] mb-1 mt-2 first:mt-0">{children}</h3>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          return isBlock
            ? <code className="block bg-black/40 rounded px-3 py-2 text-xs font-mono text-emerald-300 my-2 overflow-x-auto">{children}</code>
            : <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono text-emerald-300">{children}</code>
        },
        pre: ({ children }) => <pre className="my-2">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#00e5b0]/40 pl-3 my-2 text-slate-400 italic text-sm">{children}</blockquote>
        ),
        hr: () => <hr className="border-[#2a3040] my-3" />,
        a: ({ href, children }) => (
          <a href={href} className="text-[#00e5b0] underline hover:text-[#00e5b0]/80" target="_blank" rel="noopener noreferrer">{children}</a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

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
  const [listening, setListening] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [ttsSupported, setTtsSupported] = useState(false)
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sentInitial = useRef(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    setVoiceSupported(!!SpeechRec)
    setTtsSupported(!!window.speechSynthesis)
    if (window.speechSynthesis) synthRef.current = window.speechSynthesis
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const speak = useCallback((text: string, msgIdx?: number) => {
    if (!synthRef.current || !ttsSupported) return
    synthRef.current.cancel()
    const clean = text.replace(/\*\*|__|~~|\[.*?\]\(.*?\)|`{1,3}|#{1,3}\s/g, '').trim()
    const utter = new SpeechSynthesisUtterance(clean)
    utter.rate = 0.95
    utter.pitch = 1.0
    utter.volume = 1.0
    const voices = synthRef.current.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')
    )
    if (preferred) utter.voice = preferred
    if (msgIdx !== undefined) setSpeakingMsgIdx(msgIdx)
    utter.onend = () => setSpeakingMsgIdx(null)
    utter.onerror = () => setSpeakingMsgIdx(null)
    synthRef.current.speak(utter)
  }, [ttsSupported])

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel()
    setSpeakingMsgIdx(null)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec || listening) return
    stopSpeaking()

    const rec = new SpeechRec()
    recognitionRef.current = rec
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    let finalTranscript = ''

    rec.onstart = () => setListening(true)
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      finalTranscript = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalTranscript += t
        else interim += t
      }
      setInput(finalTranscript || interim)
    }
    rec.onerror = () => {
      setListening(false)
      recognitionRef.current = null
    }
    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
      if (finalTranscript.trim().length > 2) {
        setTimeout(() => sendMessage(finalTranscript.trim()), 100)
      }
    }
    rec.start()
  }, [listening, stopSpeaking]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if ((!content && !attachedFile) || streaming) return

    stopSpeaking()
    setSearchStatus(null)

    // If a file is attached, upload and extract it first
    let fileContext = ''
    if (attachedFile) {
      setUploadingDoc(true)
      setSearchStatus(`📄 Reading ${attachedFile.name}…`)
      try {
        const fd = new FormData()
        fd.append('file', attachedFile)
        const res = await fetch('/api/ai/upload-doc', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.extracted) {
          fileContext = `\n\n[DOCUMENT UPLOADED: ${attachedFile.name}]\n${data.extracted}\n[END DOCUMENT]`
        } else {
          fileContext = `\n\n[Failed to read ${attachedFile.name}: ${data.error}]`
        }
      } catch (e: any) {
        fileContext = `\n\n[Upload error: ${e.message}]`
      } finally {
        setUploadingDoc(false)
        setSearchStatus(null)
        setAttachedFile(null)
      }
    }

    const finalContent = (content + fileContext).trim() || `[See uploaded document above]${fileContext}`
    const userMsg: Message = { role: 'user', content: finalContent, timestamp: new Date().toISOString() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setStreaming(true)

    const assistantMsg: Message = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, assistantMsg])
    const assistantIdx = updatedMessages.length

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
            if (parsed.status === 'saving') {
              setSearchStatus(`💾 Saving ${parsed.entity || 'data'}...`)
            }
            if (parsed.status === 'searching') {
              setSearchStatus(`🔍 Searching: ${parsed.query || '...'}`)
            }
            if (parsed.status === 'responding' || parsed.done) {
              setSearchStatus(null)
            }
          } catch {}
        }
      }

      if (autoSpeak && accumulated) {
        speak(accumulated, assistantIdx)
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: '⚠️ Connection error. Please try again.' }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }, [input, messages, streaming, conversationId, autoSpeak, speak, stopSpeaking])

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

      {/* Voice controls bar */}
      <div className="flex items-center gap-3 mb-3">
        {ttsSupported && (
          <button
            onClick={() => {
              setAutoSpeak(v => !v)
              if (speakingMsgIdx !== null) stopSpeaking()
            }}
            title={autoSpeak ? 'Auto-speak ON — click to disable' : 'Auto-speak OFF — click to enable'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs border transition-all ${
              autoSpeak
                ? 'bg-[#00e5b0]/20 border-[#00e5b0]/60 text-[#00e5b0]'
                : 'bg-[#1a1f2e] border-[#2a3040] text-slate-500 hover:border-slate-400 hover:text-slate-300'
            }`}
          >
            {autoSpeak ? '🔊 Speaking' : '🔇 Muted'}
          </button>
        )}
        <span className="text-xs text-slate-600 ml-auto">
          {voiceSupported ? '🎤 Voice input ready' : ''}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">🤖</div>
            <p className="font-medium text-slate-400">Your AI CFO is ready.</p>
            <p className="text-sm mt-1">Ask anything, choose a quick action above, or tap the mic to speak.</p>
          </div>
        )}

        {/* Search status indicator */}
        {searchStatus && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1628] border border-[#00e5b0]/20 rounded-xl text-sm text-[#00e5b0] animate-pulse">
            <span className="text-base">🌐</span>
            <span>{searchStatus}</span>
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
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#00e5b0] text-black font-medium rounded-tr-sm'
                  : 'bg-[#1a1f2e] border border-[#2a3040] text-slate-200 rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <>
                  <MarkdownMessage content={msg.content} />
                  {streaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-[#00e5b0] ml-1 animate-pulse rounded-sm" />
                  )}
                </>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>

            {msg.role === 'assistant' && msg.content && !streaming && ttsSupported && (
              <button
                onClick={() => speakingMsgIdx === i ? stopSpeaking() : speak(msg.content, i)}
                title={speakingMsgIdx === i ? 'Stop' : 'Read aloud'}
                className="ml-2 mt-1 w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1a1f2e] border border-[#2a3040] text-xs hover:border-[#00e5b0] hover:text-[#00e5b0] transition-all self-start"
              >
                {speakingMsgIdx === i ? '⏹' : '▶'}
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex gap-2 items-end">
        {/* File attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={streaming || uploadingDoc}
          title="Upload bank statement, bill, or receipt (PDF, JPEG, PNG, CSV)"
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            attachedFile
              ? 'bg-[#00e5b0]/20 border-[#00e5b0]/60 text-[#00e5b0]'
              : 'bg-[#1a1f2e] border-[#2a3040] text-slate-400 hover:border-[#00e5b0] hover:text-[#00e5b0]'
          }`}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.txt,.gif"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0] ?? null
            setAttachedFile(f)
            e.target.value = ''
          }}
        />

        {voiceSupported && (
          <button
            onClick={listening ? stopListening : startListening}
            disabled={streaming}
            title={listening ? 'Stop listening' : 'Speak to your CFO'}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              listening
                ? 'bg-red-500/20 border-red-500/60 text-red-400 animate-pulse'
                : 'bg-[#1a1f2e] border-[#2a3040] text-slate-400 hover:border-[#00e5b0] hover:text-[#00e5b0]'
            }`}
          >
            {listening ? '⏹' : '🎤'}
          </button>
        )}

        <div className="relative flex-1 flex gap-3 items-end bg-[#1a1f2e] border border-[#2a3040] rounded-2xl p-3 focus-within:border-[#00e5b0] transition-colors">
          {attachedFile && (
            <div className="absolute bottom-full mb-2 left-0 flex items-center gap-2 bg-[#0a1628] border border-[#00e5b0]/30 rounded-lg px-3 py-1.5 text-xs text-[#00e5b0]">
              <span>📄</span>
              <span className="max-w-[200px] truncate">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="ml-1 text-slate-500 hover:text-white">✕</button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? '🎤 Listening…' : attachedFile ? `📄 ${attachedFile.name} ready — add a note or just send` : 'Ask your AI CFO anything… or upload a statement 📎'}
            rows={1}
            disabled={streaming || listening}
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 resize-none focus:outline-none text-sm leading-relaxed max-h-32 disabled:opacity-50"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={streaming || uploadingDoc || (!input.trim() && !attachedFile) || listening}
            className="btn-primary px-4 py-2 text-sm flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {streaming ? '…' : '→'}
          </button>
        </div>
      </div>

      {listening && (
        <p className="text-xs text-red-400 text-center mt-2 animate-pulse">
          🔴 Listening… speak now, then pause to send
        </p>
      )}
    </div>
  )
}
