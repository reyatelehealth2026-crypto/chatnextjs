'use client'

import { useEffect, useState } from 'react'

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null)
  const [sla, setSla] = useState<any>(null)
  const [satisfaction, setSatisfaction] = useState<any>(null)
  const [admins, setAdmins] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const [o, s, sat, a] = await Promise.all([
        fetch('/api/inbox/analytics/overview'),
        fetch('/api/inbox/analytics/sla'),
        fetch('/api/inbox/analytics/satisfaction'),
        fetch('/api/inbox/analytics/admins'),
      ])

      for (const res of [o, s, sat, a]) {
        if (!res.ok) {
          const j = await safeJson(res)
          throw new Error(j?.error?.message ?? 'Failed to fetch analytics')
        }
      }

      setOverview((await o.json())?.data ?? null)
      setSla((await s.json())?.data ?? null)
      setSatisfaction((await sat.json())?.data ?? null)
      setAdmins((await a.json())?.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch analytics')
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
        <div className="mt-2 flex gap-2">
          <a
            className="h-9 rounded border px-3 text-sm hover:bg-gray-50 flex items-center"
            href="/api/inbox/analytics/export"
          >
            Export CSV
          </a>
          <button
            type="button"
            className="h-9 rounded bg-gray-900 px-3 text-sm text-white hover:bg-gray-800"
            onClick={load}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Customers" value={overview?.customers ?? '-'} />
        <MetricCard title="Conversations (total)" value={overview?.conversations?.total ?? '-'} />
        <MetricCard title="Messages (total)" value={overview?.messages?.total ?? '-'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">SLA</h2>
          <div className="mt-2 text-sm text-gray-700">
            <div>
              First response avg (sec): {sla?.firstResponse?.averageSeconds?.toFixed?.(1) ?? '-'}
            </div>
            <div>
              First response compliance:{' '}
              {sla?.firstResponse?.compliance != null
                ? `${Math.round(sla.firstResponse.compliance * 100)}%`
                : '-'}
            </div>
            <div className="mt-2">
              Resolution avg (sec): {sla?.resolution?.averageSeconds?.toFixed?.(1) ?? '-'}
            </div>
            <div>
              Resolution compliance:{' '}
              {sla?.resolution?.compliance != null
                ? `${Math.round(sla.resolution.compliance * 100)}%`
                : '-'}
            </div>
          </div>
        </div>

        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Satisfaction</h2>
          <div className="mt-2 text-sm text-gray-700">
            <div>Average: {satisfaction?.average?.toFixed?.(2) ?? '-'}</div>
            <div>Count: {satisfaction?.count ?? '-'}</div>
            <div className="mt-2 grid grid-cols-5 gap-2 text-xs text-gray-600">
              {[1, 2, 3, 4, 5].map((r) => (
                <div key={r} className="rounded border p-2 text-center">
                  <div className="font-semibold">{r}</div>
                  <div>{satisfaction?.distribution?.[String(r)] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded border bg-white">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold text-gray-900">Admins</h2>
        </div>
        {!admins ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : (
          <div className="divide-y">
            {(admins.admins ?? []).map((a: any) => (
              <div key={a.id} className="p-4 text-sm">
                <div className="font-medium text-gray-900">{a.name ?? a.email}</div>
                <div className="mt-1 text-xs text-gray-500">
                  Role: {a.role} • Assigned: {a.assignedConversations} • Outbound: {a.outboundMessages}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}

