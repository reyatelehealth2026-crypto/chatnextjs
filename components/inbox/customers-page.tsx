'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type CustomerRow = {
  id: string
  displayName: string
  pictureUrl: string | null
  lineUserId: string
  statusMessage: string | null
  lastContactAt: string | null
  isBlocked: boolean
  _count: { conversations: number }
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchCustomers = async (q: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const url = new URL('/api/inbox/customers', window.location.origin)
      if (q.trim()) url.searchParams.set('search', q.trim())
      const res = await fetch(url.toString())
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error?.message ?? 'Failed to fetch customers')
      }
      const j = await res.json()
      setCustomers(j?.data?.customers ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch customers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers('')
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            fetchCustomers(search)
          }}
        >
          <input
            className="h-10 flex-1 rounded border px-3 text-sm"
            placeholder="Search by name or LINE userId…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="h-10 rounded bg-gray-900 px-4 text-sm text-white hover:bg-gray-800"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto rounded border bg-white">
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-gray-500">No customers</div>
        ) : (
          <div className="divide-y">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/inbox/customers/${c.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium text-gray-900">
                        {c.displayName}
                      </div>
                      {c.isBlocked && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Blocked
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm text-gray-600">
                      {c.statusMessage ?? c.lineUserId}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Conversations: {c._count.conversations}</div>
                    {c.lastContactAt && (
                      <div>{new Date(c.lastContactAt).toLocaleString()}</div>
                    )}
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

