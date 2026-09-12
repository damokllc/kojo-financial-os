'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'

interface PlaidLinkProps {
  onSuccess?: (institution: string, accountCount: number) => void
}

// Inner button — only rendered when we have a valid token.
// usePlaidLink MUST be called unconditionally (rules of hooks),
// so it lives in its own component that's only mounted when token exists.
function PlaidLinkButton({
  linkToken,
  onSuccess,
  onReset,
}: {
  linkToken: string
  onSuccess?: PlaidLinkProps['onSuccess']
  onReset: () => void
}) {
  const [linking, setLinking] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const onPlaidSuccess = useCallback(
    (publicToken: string) => {
      void (async () => {
        setLinking(true)
        setStatus('Linking accounts…')
        try {
          const res = await fetch('/api/plaid/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token: publicToken }),
          })
          const data = await res.json()
          if (data.success) {
            setStatus(`✅ ${data.accountsSynced} accounts linked from ${data.institution}`)
            onSuccess?.(data.institution, data.accountsSynced)
            setTimeout(() => window.location.reload(), 1500)
          } else {
            setStatus(`❌ ${data.error}`)
            onReset()
          }
        } catch (e: unknown) {
          setStatus(`❌ ${e instanceof Error ? e.message : 'Unknown error'}`)
          onReset()
        } finally {
          setLinking(false)
        }
      })()
    },
    [onSuccess, onReset],
  )

  const onExit = useCallback(() => { onReset() }, [onReset])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess: onPlaidSuccess as any, onExit })

  return (
    <>
      <button
        onClick={() => open()}
        disabled={!ready || linking}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
      >
        🏦 {linking ? 'Linking…' : ready ? 'Connect Bank / Credit Card' : 'Preparing…'}
      </button>
      {status && <p className="text-xs text-slate-300 mt-1">{status}</p>}
    </>
  )
}

export default function PlaidLink({ onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    setFetching(true)
    setError(null)
    setLinkToken(null)
    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' })
      const data = await res.json()
      if (data.link_token) {
        setLinkToken(data.link_token)
      } else {
        setError(data.error || 'Could not start Plaid Link')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => { void fetchToken() }, [fetchToken])

  const syncAll = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSyncMsg(`✅ Synced ${data.accountsUpdated} accounts, ${data.transactionsAdded} new transactions`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setSyncMsg(data.message || `❌ ${data.error}`)
      }
    } catch (e: unknown) {
      setSyncMsg(`❌ ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2 flex-wrap items-center">
        {linkToken ? (
          <PlaidLinkButton linkToken={linkToken} onSuccess={onSuccess} onReset={fetchToken} />
        ) : fetching ? (
          <button disabled className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700/60 cursor-not-allowed text-white rounded-lg text-sm font-medium">
            🏦 Connect Bank / Credit Card
          </button>
        ) : (
          /* Error state — show a clickable retry button so it's obvious */
          <button
            onClick={() => void fetchToken()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            🏦 Connect Bank / Credit Card ↺
          </button>
        )}

        <button
          onClick={syncAll}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm transition-colors"
        >
          🔄 {syncing ? 'Syncing…' : 'Sync All'}
        </button>
      </div>

      {/* Error details — shown small below the buttons */}
      {error && !fetching && (
        <p className="text-xs text-red-400">
          {error.includes('not configured')
            ? '⚠️ Plaid not configured in .env.local'
            : `Plaid: ${error}`}
        </p>
      )}
      {syncMsg && <p className="text-xs text-slate-300">{syncMsg}</p>}
    </div>
  )
}
