import Link from 'next/link'
import ResetForm from './ResetForm'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
          <p className="text-slate-400 mt-1 text-sm">Kojo Financial OS</p>
        </div>

        <div className="card">
          {token ? (
            <ResetForm token={token} />
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              This page needs the link from your reset email.
            </div>
          )}
        </div>

        <p className="text-center text-sm mt-6">
          <Link href="/auth/forgot" className="text-[#00e5b0] hover:underline">
            Send a new reset link
          </Link>
        </p>
      </div>
    </main>
  )
}
