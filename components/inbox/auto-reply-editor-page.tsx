'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCsrfToken } from '@/lib/csrf-client'

type Rule = {
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

export function AutoReplyEditorPage({ ruleId }: { ruleId: string }) {
  const router = useRouter()
  const [rule, setRule] = useState<Rule | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState('KEYWORD_CONTAINS')
  const [triggerValue, setTriggerValue] = useState('')
  const [responseContent, setResponseContent] = useState('')
  const [priority, setPriority] = useState(0)
  const [isEnabled, setIsEnabled] = useState(true)

  const refresh = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/inbox/auto-reply-rules/${ruleId}`)
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch rule')
      }
      const j = await res.json()
      const r = j?.data?.rule as Rule
      setRule(r)
      setName(r.name)
      setTriggerType(r.triggerType)
      setTriggerValue(r.triggerValue)
      setResponseContent(r.responseContent)
      setPriority(r.priority)
      setIsEnabled(r.isEnabled)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch rule')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const save = async () => {
    setError(null)
    const res = await fetch(`/api/inbox/auto-reply-rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        name,
        triggerType,
        triggerValue,
        responseContent,
        priority,
        isEnabled,
      }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to save rule')
      return
    }
    await refresh()
  }

  const remove = async () => {
    setError(null)
    const res = await fetch(`/api/inbox/auto-reply-rules/${ruleId}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': getCsrfToken() },
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to delete rule')
      return
    }
    router.push('/inbox/auto-reply')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Link href="/inbox/auto-reply" className="text-sm text-blue-600 hover:underline">
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
        ) : !rule ? (
          <div className="text-gray-700">Rule not found</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit rule</h1>
                <div className="mt-1 text-xs text-gray-500">
                  Used: {rule.usageCount} · Updated: {new Date(rule.updatedAt).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                className="h-9 rounded border border-red-200 bg-red-50 px-3 text-sm text-red-700 hover:bg-red-100"
                onClick={remove}
              >
                Delete
              </button>
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
                rows={6}
                placeholder="Response content"
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
              />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                />
                Enabled
              </label>
            </div>

            <button
              type="button"
              className="mt-3 h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              onClick={save}
              disabled={!name.trim() || !triggerValue.trim() || !responseContent.trim()}
            >
              Save
            </button>
          </>
        )}
      </div>
    </div>
  )
}
