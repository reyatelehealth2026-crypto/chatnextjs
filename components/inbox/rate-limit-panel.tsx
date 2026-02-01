'use client'

import { useEffect, useState } from 'react'

type LimitState = {
  ok: boolean
  limit: number
  remaining: number
  resetAt: number
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function RateLimitPanel() {
  const [data, setData] = useState<{ perSession: LimitState; perAccount: LimitState } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const res = await fetch('/api/inbox/rate-limit')
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch rate limit status')
      }
      const j = await res.json()
      setData(j?.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch rate limit status')
    }
  }

  useEffect(() => {
    load()
    const id = window.setInterval(load, 30_000)
    return () => window.clearInterval(id)
  }, [])

  const warn = (s: LimitState) => s.limit > 0 && s.remaining / s.limit <= 0.2

  return (
    <div className="rounded border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Rate limits</div>
          <div className="mt-1 text-sm text-gray-600">Current window usage</div>
        </div>
        <button
          type="button"
          className="h-9 rounded border px-3 text-sm hover:bg-gray-50"
          onClick={load}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!data ? (
        <div className="mt-3 text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <LimitCard title="Per session" state={data.perSession} warn={warn(data.perSession)} />
          <LimitCard title="Per account" state={data.perAccount} warn={warn(data.perAccount)} />
        </div>
      )}
    </div>
  )
}

function LimitCard({ title, state, warn }: { title: string; state: LimitState; warn: boolean }) {
  const reset = new Date(state.resetAt).toLocaleTimeString()
  return (
    <div className={`rounded border p-3 ${warn ? 'border-yellow-200 bg-yellow-50' : 'bg-white'}`}>
      <div className="text-sm font-medium text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-700">
        Remaining: <span className="font-semibold">{state.remaining}</span> / {state.limit}
      </div>
      <div className="mt-1 text-xs text-gray-500">Resets: {reset}</div>
    </div>
  )
}

