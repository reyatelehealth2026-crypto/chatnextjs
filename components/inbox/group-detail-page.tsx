'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCsrfToken } from '@/lib/csrf-client'

type Group = {
  id: string
  name: string
  lineGroupId: string
  pictureUrl: string | null
  memberCount: number
  members: Array<{ id: string; displayName: string; lineUserId: string; pictureUrl: string | null }>
  messages: Array<{ id: string; content: string; createdAt: string; lineUserId: string }>
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function GroupDetailPage({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/inbox/groups/${groupId}`)
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch group')
      }
      const j = await res.json()
      setGroup(j?.data?.group ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch group')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  const send = async () => {
    if (!message.trim()) return
    setError(null)
    const res = await fetch(`/api/inbox/groups/${groupId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ content: message }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to send')
      return
    }
    setMessage('')
    await load()
  }

  return (
    <div className="space-y-4">
      <Link href="/inbox/groups" className="text-sm text-blue-600 hover:underline">
        ← Back
      </Link>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded border bg-white p-4 text-gray-500">Loading…</div>
      ) : !group ? (
        <div className="rounded border bg-white p-4 text-gray-700">Group not found</div>
      ) : (
        <>
          <div className="rounded border bg-white p-4">
            <div className="flex items-center gap-3">
              {group.pictureUrl ? (
                <img src={group.pictureUrl} alt={group.name} className="h-12 w-12 rounded-full" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-200" />
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{group.name}</h1>
                <div className="text-sm text-gray-600">Members: {group.memberCount}</div>
                <div className="text-xs text-gray-500 break-all">{group.lineGroupId}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Messages</h2>
                <button
                  type="button"
                  className="h-9 rounded border px-3 text-sm hover:bg-gray-50"
                  onClick={load}
                >
                  Refresh
                </button>
              </div>
              <div className="mt-3 space-y-3 max-h-[420px] overflow-auto">
                {group.messages.length === 0 && (
                  <div className="text-sm text-gray-500">No messages</div>
                )}
                {group.messages.map((m) => (
                  <div key={m.id} className="rounded border p-3">
                    <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <textarea
                  className="w-full rounded border p-2 text-sm"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Send a message to this group…"
                />
                <button
                  type="button"
                  className="h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
                  onClick={send}
                  disabled={!message.trim()}
                >
                  Send
                </button>
              </div>
            </div>

            <div className="rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Members</h2>
                <button
                  type="button"
                  className="h-9 rounded border px-3 text-sm hover:bg-gray-50"
                  onClick={() =>
                    fetch(`/api/inbox/groups/${group.id}/sync`, {
                      method: 'POST',
                      headers: { 'x-csrf-token': getCsrfToken() },
                    }).then(load)
                  }
                >
                  Sync members
                </button>
              </div>
              <div className="mt-3 space-y-2 max-h-[420px] overflow-auto">
                {group.members.length === 0 && <div className="text-sm text-gray-500">No members</div>}
                {group.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded border p-2">
                    {m.pictureUrl ? (
                      <img src={m.pictureUrl} alt={m.displayName} className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200" />
                    )}
                    <div className="text-sm text-gray-900">{m.displayName}</div>
                    <div className="text-xs text-gray-500 break-all">{m.lineUserId}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

