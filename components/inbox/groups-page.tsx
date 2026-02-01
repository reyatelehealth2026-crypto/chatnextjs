'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Group = {
  id: string
  name: string
  lineGroupId: string
  pictureUrl: string | null
  memberCount: number
  lastMessageAt: string | null
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function GroupListPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/inbox/groups')
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch groups')
      }
      const j = await res.json()
      setGroups(j?.data?.groups ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch groups')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">LINE Groups</h1>
        <p className="mt-1 text-sm text-gray-600">Group conversations for this account</p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border bg-white">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold text-gray-900">Groups</h2>
        </div>
        {isLoading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="p-4 text-gray-500">No groups</div>
        ) : (
          <div className="divide-y">
            {groups.map((g) => (
              <Link key={g.id} href={`/inbox/groups/${g.id}`} className="block p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {g.pictureUrl ? (
                        <img src={g.pictureUrl} alt={g.name} className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200" />
                      )}
                      <div className="truncate font-medium text-gray-900">{g.name}</div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Members: {g.memberCount} • Last message:{' '}
                      {g.lastMessageAt ? new Date(g.lastMessageAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 break-all">{g.lineGroupId}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
