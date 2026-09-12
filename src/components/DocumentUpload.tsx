'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  'CREDIT_REPORT', 'BANK_STATEMENT', 'TAX_DOCUMENT', 'LOAN_DOCUMENT',
  'INSURANCE', 'CONTRACT', 'BUSINESS_DOCUMENT', 'INVOICE', 'LEGAL',
  'PROPERTY', 'INVESTMENT_STATEMENT', 'IDENTITY', 'OTHER',
]

export default function DocumentUpload() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('OTHER')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      form.append('title', title || file.name)
      const res = await fetch('/api/ai/upload-doc', { method: 'POST', body: form })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Upload failed')
      }
      setSuccess(true)
      setFile(null)
      setTitle('')
      if (fileRef.current) fileRef.current.value = ''
      setTimeout(() => {
        setSuccess(false)
        setOpen(false)
        router.refresh()
      }, 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="px-4 py-2 bg-[#00e5b0] hover:bg-[#00e5b0]/80 text-black font-semibold rounded-lg text-sm transition-colors"
      >
        + Upload Document
      </button>

      {open && (
        <div className="mt-4 bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Upload a Document</h3>

          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#2a3040] rounded-xl p-6 text-center cursor-pointer hover:border-[#00e5b0]/40 transition-colors"
          >
            {file ? (
              <div>
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl mb-1">📁</p>
                <p className="text-sm text-slate-400">Click to choose a file</p>
                <p className="text-xs text-slate-600 mt-0.5">PDF, images, CSV, DOCX up to 10MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.docx,.txt" />

          {/* Title */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Equifax Credit Report June 2026"
              className="w-full bg-[#0d1420] border border-[#2a3040] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#00e5b0]/40"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#0d1420] border border-[#2a3040] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e5b0]/40"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">✅ Uploaded! AXIOM is analyzing it now.</p>}

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 py-2 bg-[#00e5b0] hover:bg-[#00e5b0]/80 disabled:opacity-50 text-black font-semibold rounded-lg text-sm transition-colors"
            >
              {uploading ? 'Uploading…' : '⬆ Upload & Analyze'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 bg-[#1f2937] text-slate-400 hover:text-white rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
