import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import Link from 'next/link'
import DocumentUpload from '@/components/DocumentUpload'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

const CATEGORY_ICONS: Record<string, string> = {
  CREDIT_REPORT: '📈',
  BANK_STATEMENT: '🏦',
  TAX_DOCUMENT: '🧾',
  LOAN_DOCUMENT: '📝',
  INSURANCE: '🛡️',
  CONTRACT: '📄',
  BUSINESS_DOCUMENT: '🏢',
  RECEIPT: '🧾',
  INVOICE: '💰',
  LEGAL: '⚖️',
  PROPERTY: '🏠',
  VEHICLE: '🚗',
  INVESTMENT_STATEMENT: '📊',
  IDENTITY: '🪪',
  OTHER: '📁',
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false
  const days = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return days > 0 && days < 30
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const userId = session.user.id

  const docs = await safeQuery(sql`
    SELECT *
    FROM "Document"
    WHERE "userId" = ${userId}
    ORDER BY "uploadedAt" DESC
  `) as any[]

  // Group by category
  const byCategory: Record<string, any[]> = {}
  for (const d of docs) {
    if (!byCategory[d.category]) byCategory[d.category] = []
    byCategory[d.category].push(d)
  }

  const expiring = docs.filter(d => isExpiringSoon(d.expiresAt))
  const expired = docs.filter(d => isExpired(d.expiresAt))

  const totalSize = docs.reduce((sum, d) => sum + (d.fileSizeBytes || 0), 0)

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Vault</h1>
          <p className="text-slate-400 text-sm mt-0.5">Secure storage for credit reports, statements, contracts, and more</p>
        </div>
        <Link
          href="/ai?q=What documents should I upload to get the most out of Kojo Financial OS?"
          className="px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all"
        >
          🤖 What to upload?
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: docs.length.toString(), icon: '📁' },
          { label: 'Storage Used', value: formatBytes(totalSize), icon: '💾' },
          { label: 'Expiring Soon', value: expiring.length.toString(), icon: '⏳', warn: expiring.length > 0 },
          { label: 'Expired', value: expired.length.toString(), icon: '🗓️', warn: expired.length > 0 },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 flex items-center gap-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className={`text-2xl font-bold ${s.warn ? 'text-orange-400' : 'text-white'}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload */}
      <DocumentUpload />

      {/* Expiring warnings */}
      {expiring.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-5 py-3">
          <div className="text-sm text-orange-400 font-semibold mb-1">⏳ Expiring Soon</div>
          <div className="flex flex-wrap gap-2">
            {expiring.map(d => (
              <span key={d.id} className="text-xs text-orange-300">
                {d.title} — expires {new Date(d.expiresAt).toLocaleDateString()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {docs.length === 0 ? (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📁</div>
          <h3 className="text-lg font-semibold text-white mb-2">Vault is empty</h3>
          <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">
            Upload credit reports, bank statements, contracts, and key documents. Your AI CFO will extract and analyze them automatically.
          </p>
          <div className="flex flex-col items-center gap-3">
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 max-w-xs">
              {['📈 Credit Reports', '🏦 Bank Statements', '🧾 Tax Documents', '📝 Loan Docs', '⚖️ Legal Docs', '🏢 Business Docs'].map(l => (
                <span key={l} className="px-2 py-1 bg-[#1f2937] rounded text-center">{l}</span>
              ))}
            </div>
            <Link
              href="/ai?q=How do I upload and use my documents in Kojo Financial OS?"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00e5b0]/10 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-sm hover:bg-[#00e5b0]/20 transition-all mt-2"
            >
              🤖 Ask AI CFO
            </Link>
          </div>
        </div>
      ) : (
        /* Documents by category */
        <div className="space-y-4">
          {Object.entries(byCategory).map(([category, catDocs]) => (
            <div key={category} className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1f2937] flex items-center gap-2">
                <span>{CATEGORY_ICONS[category] ?? '📁'}</span>
                <h2 className="text-sm font-semibold text-slate-300">
                  {category.replace(/_/g, ' ')}
                  <span className="ml-2 text-slate-600 font-normal">({catDocs.length})</span>
                </h2>
              </div>
              <div className="divide-y divide-[#1f2937]">
                {catDocs.map(d => (
                  <div key={d.id} className={`px-5 py-3 flex items-center justify-between ${isExpired(d.expiresAt) ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{d.title}</span>
                        {isExpired(d.expiresAt) && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">Expired</span>
                        )}
                        {isExpiringSoon(d.expiresAt) && !isExpired(d.expiresAt) && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">Expiring soon</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{d.fileType?.toUpperCase()}</span>
                        <span>•</span>
                        <span>{formatBytes(d.fileSizeBytes)}</span>
                        {d.relatedEntity && <><span>•</span><span>{d.relatedEntity}</span></>}
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <div className="text-xs text-slate-500">
                        {new Date(d.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {d.expiresAt && (
                        <div className={`text-xs mt-0.5 ${isExpired(d.expiresAt) ? 'text-red-400' : isExpiringSoon(d.expiresAt) ? 'text-orange-400' : 'text-slate-600'}`}>
                          Exp: {new Date(d.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
