'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCsrfToken } from '@/lib/csrf-client'

type Segment = {
  id: string
  name: string
  description: string | null
  criteria: any
  memberCount: number
  members: Array<{ id: string; customer: { id: string; displayName: string; lineUserId: string } }>
  updatedAt: string
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function SegmentEditorPage({ segmentId }: { segmentId: string }) {
  const router = useRouter()
  const [segment, setSegment] = useState<Segment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [criteriaJson, setCriteriaJson] = useState('{}')

  const refresh = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/inbox/segments/${segmentId}`)
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch segment')
      }
      const j = await res.json()
      const s = j?.data?.segment as Segment
      setSegment(s)
      setName(s.name)
      setDescription(s.description ?? '')
      setCriteriaJson(JSON.stringify(s.criteria ?? {}, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch segment')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const save = async () => {
    setError(null)
    let criteria: any
    try {
      criteria = JSON.parse(criteriaJson || '{}')
    } catch {
      setError('criteria must be valid JSON')
      return
    }

    const res = await fetch(`/api/inbox/segments/${segmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        name,
        description: description.trim() || null,
        criteria,
      }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to save segment')
      return
    }
    await refresh()
  }

  const remove = async () => {
    setError(null)
    const res = await fetch(`/api/inbox/segments/${segmentId}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': getCsrfToken() },
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to delete segment')
      return
    }
    router.push('/inbox/segments')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Link href="/inbox/segments" className="text-sm text-blue-600 hover:underline">
        ← Back
      </Link>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border bg-white p-4">
        {isLoading ? (
          <div className="text-gray-500">Loading…</div>
        ) : !segment ? (
          <div className="text-gray-700">Segment not found</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit segment</h1>
                <div className="mt-1 text-xs text-gray-500">
                  Members: {segment.memberCount} · Updated: {new Date(segment.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  className="h-9 rounded border px-3 text-sm hover:bg-gray-50 flex items-center"
                  href={`/api/inbox/segments/${segment.id}/export`}
                >
                  Export CSV
                </a>
                <button
                  type="button"
                  className="h-9 rounded border border-red-200 bg-red-50 px-3 text-sm text-red-700 hover:bg-red-100"
                  onClick={remove}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <input
                className="h-10 rounded border px-3 text-sm"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="h-10 rounded border px-3 text-sm"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <textarea
                className="rounded border p-3 font-mono text-xs md:col-span-2"
                rows={10}
                value={criteriaJson}
                onChange={(e) => setCriteriaJson(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="mt-3 h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              onClick={save}
              disabled={!name.trim()}
            >
              Save & recalc
            </button>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-900">Members (preview)</h2>
              <div className="mt-2 divide-y rounded border">
                {segment.members.map((m) => (
                  <Link
                    key={m.id}
                    href={`/inbox/customers/${m.customer.id}`}
                    className="block p-3 text-sm hover:bg-gray-50"
                  >
                    {m.customer.displayName} · {m.customer.lineUserId}
                  </Link>
                ))}
                {segment.members.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No members</div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Preview shows only the latest 50 members.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
