'use client'

import { useEffect, useMemo, useState } from 'react'
import { getCsrfToken } from '@/lib/csrf-client'

type BroadcastRow = {
  id: string
  name: string
  content: string
  targetType: 'ALL' | 'SEGMENT' | 'CUSTOM'
  targetIds: string[]
  recipientCount: number
  sentCount: number
  failedCount: number
  status: string
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [targetType, setTargetType] = useState<'ALL' | 'SEGMENT' | 'CUSTOM'>('ALL')
  const [targetIdsText, setTargetIdsText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sendNow, setSendNow] = useState(true)

  const targetIds = useMemo(
    () =>
      targetIdsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [targetIdsText]
  )

  const refresh = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/inbox/broadcasts')
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch broadcasts')
      }
      const j = await res.json()
      setBroadcasts(j?.data?.broadcasts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch broadcasts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const create = async () => {
    setError(null)
    const res = await fetch('/api/inbox/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        name,
        content,
        targetType,
        targetIds: targetType === 'ALL' ? [] : targetIds,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        sendNow,
      }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to create broadcast')
      return
    }
    setName('')
    setContent('')
    setTargetType('ALL')
    setTargetIdsText('')
    setScheduledAt('')
    setSendNow(true)
    await refresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">Broadcasts</h1>
        <p className="mt-1 text-sm text-gray-600">Send a message to many customers</p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create broadcast</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className="h-10 rounded border px-3 text-sm md:col-span-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="h-10 rounded border px-3 text-sm"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as any)}
          >
            <option value="ALL">All customers</option>
            <option value="SEGMENT">By segment id(s)</option>
            <option value="CUSTOM">By customer id(s)</option>
          </select>
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder={targetType === 'SEGMENT' ? 'Segment id(s), comma separated' : 'Customer id(s), comma separated'}
            value={targetIdsText}
            onChange={(e) => setTargetIdsText(e.target.value)}
            disabled={targetType === 'ALL'}
          />
          <input
            className="h-10 rounded border px-3 text-sm"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={sendNow}
              onChange={(e) => setSendNow(e.target.checked)}
              disabled={Boolean(scheduledAt)}
            />
            Send immediately
          </label>
          <textarea
            className="rounded border p-3 text-sm md:col-span-2"
            rows={4}
            placeholder="Message content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="mt-3 h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          onClick={create}
          disabled={
            !name.trim() ||
            !content.trim() ||
            (targetType !== 'ALL' && targetIds.length === 0)
          }
        >
          Create
        </button>
      </div>

      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold text-gray-900">All broadcasts</h2>
          <button
            type="button"
            className="h-9 rounded border px-3 text-sm hover:bg-gray-50"
            onClick={refresh}
          >
            Refresh
          </button>
        </div>
        {isLoading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : broadcasts.length === 0 ? (
          <div className="p-4 text-gray-500">No broadcasts</div>
        ) : (
          <div className="divide-y">
            {broadcasts.map((b) => (
              <div key={b.id} className="p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">{b.name}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      Status: {b.status} • Target: {b.targetType} • Recipients: {b.recipientCount} • Sent: {b.sentCount} • Failed: {b.failedCount}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {b.scheduledAt && <div>Scheduled: {new Date(b.scheduledAt).toLocaleString()}</div>}
                    {b.sentAt && <div>Sent: {new Date(b.sentAt).toLocaleString()}</div>}
                    <div>{new Date(b.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-2 line-clamp-2 text-xs text-gray-600">{b.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

