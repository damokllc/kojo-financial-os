import { auth } from '@/lib/auth'
import MyWorldSection from '@/components/MyWorldSection'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db/neon'
import Link from 'next/link'

async function safeQuery<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query } catch { return [] }
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const userId = session.user.id

  const [profileRows, userRows] = await Promise.all([
    safeQuery(sql`SELECT * FROM "Profile" WHERE "userId" = ${userId} LIMIT 1`),
    safeQuery(sql`SELECT id, email, name, "createdAt" FROM "User" WHERE id = ${userId} LIMIT 1`),
  ]) as [any[], any[]]

  const profile = profileRows[0] ?? null
  const user = userRows[0] ?? null

  const sections = [
    {
      title: 'Account',
      icon: '👤',
      items: [
        { label: 'Email', value: user?.email || session.user.email || 'Unknown', verified: true },
        { label: 'Name', value: user?.name || 'Not set' },
        { label: 'Member since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown' },
      ]
    },
    {
      title: 'Profile',
      icon: '📋',
      items: [
        { label: 'Preferred Name', value: profile?.preferredName || 'Not set' },
        { label: 'Legal Name', value: profile?.legalName || 'Not set' },
        { label: 'Phone', value: profile?.phone || 'Not set' },
        { label: 'Location', value: [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || 'Not set' },
        { label: 'Primary Currency', value: profile?.primaryCurrency || 'USD' },
        { label: 'Ghana Operations', value: profile?.ghanaOps ? '✅ Enabled' : '❌ Disabled' },
        { label: 'Risk Tolerance', value: profile?.riskTolerance ? profile.riskTolerance.charAt(0).toUpperCase() + profile.riskTolerance.slice(1) : 'Medium' },
      ]
    },
  ]

  return (
    <div className="p-6 space-y-6 text-white max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Your account and profile configuration</p>
      </div>

      {sections.map(sec => (
        <div key={sec.title} className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-[#0d1420] border-b border-[#1f2937]">
            <span>{sec.icon}</span>
            <h2 className="text-sm font-semibold text-slate-300">{sec.title}</h2>
          </div>
          <div className="divide-y divide-[#1f2937]">
            {sec.items.map(item => (
              <div key={item.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-500">{item.label}</span>
                <span className={`text-sm font-medium ${item.value === 'Not set' ? 'text-slate-600 italic' : 'text-white'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Update via AI */}
      <div className="bg-[#0a1628] border border-[#00e5b0]/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#00e5b0]">Update your profile with AI</p>
            <p className="text-xs text-slate-400 mt-1">
              Tell your AI CFO to update any information — name, preferences, financial goals, or risk tolerance.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                'Update my preferred name',
                'Set my risk tolerance to aggressive',
                'Enable Ghana operations tracking',
                'Update my financial goals',
              ].map(prompt => (
                <Link
                  key={prompt}
                  href={`/ai?q=${encodeURIComponent(prompt)}`}
                  className="px-3 py-1.5 text-xs bg-[#111827] border border-[#1f2937] text-slate-300 rounded-lg hover:border-[#00e5b0]/40 hover:text-[#00e5b0] transition-all"
                >
                  {prompt}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <MyWorldSection />

      {/* Security */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-[#0d1420] border-b border-[#1f2937]">
          <span>🔒</span>
          <h2 className="text-sm font-semibold text-slate-300">Security</h2>
        </div>
        <div className="divide-y divide-[#1f2937]">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-slate-500">Authentication</span>
            <span className="text-sm text-emerald-400">NextAuth v5 ✅</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-slate-500">SSN Storage</span>
            <span className="text-sm text-emerald-400">AES-256 encrypted</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-slate-500">AI Data Access</span>
            <span className="text-sm text-slate-300">Financial context only</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-slate-500">Sign out</span>
            <Link href="/auth/signout" className="text-sm text-red-400 hover:text-red-300">Sign out →</Link>
          </div>
        </div>
      </div>

      {/* Version */}
      <p className="text-xs text-slate-700 text-center">Kojo Financial OS • v0.1.0</p>
    </div>
  )
}
