'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCsrfToken } from '@/lib/csrf-client'

type SegmentRow = {
  id: string
  name: string
  description: string | null
  memberCount: number
  updatedAt: string
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function SegmentsPage() {
  const [segments, setSegments] = useState<SegmentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagNames, setTagNames] = useState('')
  const [isBlocked, setIsBlocked] = useState<'any' | 'true' | 'false'>('any')
  const [pointsMin, setPointsMin] = useState('')
  const [pointsMax, setPointsMax] = useState('')

  const refresh = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/inbox/segments')
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch segments')
      }
      const j = await res.json()
      setSegments(j?.data?.segments ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch segments')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const create = async () => {
    setError(null)
    const criteria: any = {
      tagNames: tagNames
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    if (isBlocked !== 'any') criteria.isBlocked = isBlocked === 'true'
    if (pointsMin.trim()) criteria.pointsMin = Number(pointsMin)
    if (pointsMax.trim()) criteria.pointsMax = Number(pointsMax)

    const res = await fetch('/api/inbox/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        name,
        description: description.trim() || null,
        criteria,
      }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to create segment')
      return
    }
    setName('')
    setDescription('')
    setTagNames('')
    setIsBlocked('any')
    setPointsMin('')
    setPointsMax('')
    await refresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">Segments</h1>
        <p className="mt-1 text-sm text-gray-600">Customer segmentation</p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create segment</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="h-10 rounded border px-3 text-sm md:col-span-2"
            placeholder="Tag names (comma separated)"
            value={tagNames}
            onChange={(e) => setTagNames(e.target.value)}
          />
          <select
            className="h-10 rounded border px-3 text-sm"
            value={isBlocked}
            onChange={(e) => setIsBlocked(e.target.value as any)}
          >
            <option value="any">Blocked: any</option>
            <option value="false">Blocked: false</option>
            <option value="true">Blocked: true</option>
          </select>
          <div className="flex gap-2">
            <input
              className="h-10 flex-1 rounded border px-3 text-sm"
              placeholder="Points min"
              value={pointsMin}
              onChange={(e) => setPointsMin(e.target.value)}
            />
            <input
              className="h-10 flex-1 rounded border px-3 text-sm"
              placeholder="Points max"
              value={pointsMax}
              onChange={(e) => setPointsMax(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          className="mt-3 h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          onClick={create}
          disabled={!name.trim()}
        >
          Create
        </button>
      </div>

      <div className="rounded border bg-white">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold text-gray-900">All segments</h2>
        </div>
        {isLoading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : segments.length === 0 ? (
          <div className="p-4 text-gray-500">No segments</div>
        ) : (
          <div className="divide-y">
            {segments.map((s) => (
              <Link
                key={s.id}
                href={`/inbox/segments/${s.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">{s.name}</div>
                    {s.description && <div className="mt-1 text-sm text-gray-600">{s.description}</div>}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Members: {s.memberCount}</div>
                    <div>{new Date(s.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
