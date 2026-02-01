'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCsrfToken } from '@/lib/csrf-client'

type RuleRow = {
  id: string
  name: string
  triggerType: string
  triggerValue: string
  responseContent: string
  isEnabled: boolean
  priority: number
  usageCount: number
  updatedAt: string
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function AutoReplyPage() {
  const [rules, setRules] = useState<RuleRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState('KEYWORD_CONTAINS')
  const [triggerValue, setTriggerValue] = useState('')
  const [responseContent, setResponseContent] = useState('')
  const [priority, setPriority] = useState(0)

  const refresh = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/inbox/auto-reply-rules')
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch rules')
      }
      const j = await res.json()
      setRules(j?.data?.rules ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch rules')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const createRule = async () => {
    setError(null)
    const res = await fetch('/api/inbox/auto-reply-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        name,
        triggerType,
        triggerValue,
        responseContent,
        priority,
        isEnabled: true,
      }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to create rule')
      return
    }
    setName('')
    setTriggerValue('')
    setResponseContent('')
    setPriority(0)
    await refresh()
  }

  const toggle = async (id: string, isEnabled: boolean) => {
    const res = await fetch(`/api/inbox/auto-reply-rules/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ isEnabled }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to toggle')
      return
    }
    await refresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">Auto-Reply Rules</h1>
        <p className="mt-1 text-sm text-gray-600">Automated responses for inbound messages</p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create rule</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Priority"
            value={String(priority)}
            onChange={(e) => setPriority(parseInt(e.target.value || '0'))}
          />
          <select
            className="h-10 rounded border px-3 text-sm"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
          >
            <option value="KEYWORD_CONTAINS">Keyword contains</option>
            <option value="KEYWORD_EXACT">Keyword exact</option>
          </select>
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Trigger value"
            value={triggerValue}
            onChange={(e) => setTriggerValue(e.target.value)}
          />
          <textarea
            className="rounded border p-3 text-sm md:col-span-2"
            rows={4}
            placeholder="Response content"
            value={responseContent}
            onChange={(e) => setResponseContent(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="mt-3 h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          onClick={createRule}
          disabled={!name.trim() || !triggerValue.trim() || !responseContent.trim()}
        >
          Create
        </button>
      </div>

      <div className="rounded border bg-white">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold text-gray-900">All rules</h2>
        </div>
        {isLoading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : rules.length === 0 ? (
          <div className="p-4 text-gray-500">No rules</div>
        ) : (
          <div className="divide-y">
            {rules.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium text-gray-900">{r.name}</div>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          r.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {r.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {r.triggerType} · <span className="font-mono">{r.triggerValue}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">{r.responseContent}</div>
                    <div className="mt-2 text-xs text-gray-500">
                      Priority: {r.priority} · Used: {r.usageCount} · Updated:{' '}
                      {new Date(r.updatedAt).toLocaleString()}
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/inbox/auto-reply/${r.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="h-9 rounded border px-3 text-sm hover:bg-gray-50"
                    onClick={() => toggle(r.id, !r.isEnabled)}
                  >
                    Toggle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
