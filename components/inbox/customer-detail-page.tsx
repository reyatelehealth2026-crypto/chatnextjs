'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { getCsrfToken } from '@/lib/csrf-client'

type CustomerTag = { id: string; name: string; color: string; createdAt: string }
type CustomerNote = {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string | null; email: string }
}

type Customer = {
  id: string
  displayName: string
  pictureUrl: string | null
  lineUserId: string
  statusMessage: string | null
  language: string | null
  isBlocked: boolean
  lastContactAt: string | null
  createdAt: string
  tags: CustomerTag[]
  notes: CustomerNote[]
  conversations: Array<{ id: string; status: string; lastMessageAt: string }>
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [pointsBalance, setPointsBalance] = useState<number | null>(null)
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsDescription, setPointsDescription] = useState('')
  const [customFields, setCustomFields] = useState<
    Array<{
      id: string
      name: string
      fieldType: string
      isRequired: boolean
      options: string[]
      value: string
    }>
  >([])

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/inbox/customers/${customerId}`)
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to load customer')
      }
      const j = await res.json()
      setCustomer(j?.data?.customer ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customer')
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  const refreshPoints = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/inbox/customers/${id}/points`)
      if (!res.ok) return
      const j = await res.json()
      setPointsBalance(j?.data?.balance ?? 0)
    } catch {
      // ignore
    }
  }, [])

  const refreshCustomFields = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/inbox/customers/${id}/custom-fields`)
      if (!res.ok) return
      const j = await res.json()
      setCustomFields(j?.data?.fields ?? [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (customer?.id) refreshPoints(customer.id)
  }, [customer?.id, refreshPoints])

  useEffect(() => {
    if (customer?.id) refreshCustomFields(customer.id)
  }, [customer?.id, refreshCustomFields])

  const addTag = async (name: string) => {
    if (!customer) return
    const res = await fetch(`/api/inbox/customers/${customer.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to add tag')
      return
    }
    await refresh()
  }

  const removeTag = async (tagId: string) => {
    if (!customer) return
    const res = await fetch(
      `/api/inbox/customers/${customer.id}/tags?tagId=${encodeURIComponent(tagId)}`,
      { method: 'DELETE', headers: { 'x-csrf-token': getCsrfToken() } }
    )
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to remove tag')
      return
    }
    await refresh()
  }

  const addNote = async (content: string) => {
    if (!customer) return
    const res = await fetch(`/api/inbox/customers/${customer.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to add note')
      return
    }
    await refresh()
  }

  const removeNote = async (noteId: string) => {
    if (!customer) return
    const res = await fetch(
      `/api/inbox/customers/${customer.id}/notes?noteId=${encodeURIComponent(noteId)}`,
      { method: 'DELETE', headers: { 'x-csrf-token': getCsrfToken() } }
    )
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to remove note')
      return
    }
    await refresh()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Link href="/inbox/customers" className="text-sm text-blue-600 hover:underline">
          ← Back
        </Link>
        <div className="rounded border bg-white p-4 text-gray-700">
          {error ?? 'Customer not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link href="/inbox/customers" className="text-sm text-blue-600 hover:underline">
        ← Back
      </Link>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">{customer.displayName}</h1>
        <div className="mt-1 text-sm text-gray-600">{customer.statusMessage ?? ''}</div>
        <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
          <div>
            <span className="text-gray-500">LINE:</span> {customer.lineUserId}
          </div>
          <div>
            <span className="text-gray-500">Language:</span> {customer.language ?? '-'}
          </div>
          <div>
            <span className="text-gray-500">Blocked:</span> {customer.isBlocked ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="text-gray-500">Last contact:</span>{' '}
            {customer.lastContactAt ? new Date(customer.lastContactAt).toLocaleString() : '-'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Tags</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {customer.tags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs"
                style={{ borderColor: t.color, color: t.color }}
              >
                {t.name}
                <button type="button" className="hover:underline" onClick={() => removeTag(t.id)}>
                  x
                </button>
              </span>
            ))}
            {customer.tags.length === 0 && <span className="text-sm text-gray-500">No tags</span>}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const name = tagDraft.trim()
              if (!name) return
              setTagDraft('')
              addTag(name)
            }}
          >
            <input
              className="h-9 flex-1 rounded border px-2 text-sm"
              placeholder="Add tag…"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
            />
            <button
              type="submit"
              className="h-9 rounded bg-gray-900 px-3 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              disabled={!tagDraft.trim()}
            >
              Add
            </button>
          </form>
        </div>

        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
          <div className="mt-2 space-y-2">
            {customer.notes.map((n) => (
              <div key={n.id} className="rounded border p-2">
                <div className="text-xs text-gray-500">
                  {n.author.name ?? n.author.email} · {new Date(n.createdAt).toLocaleString()}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{n.content}</div>
                <button
                  type="button"
                  className="mt-1 text-xs text-red-600 hover:underline"
                  onClick={() => removeNote(n.id)}
                >
                  Delete
                </button>
              </div>
            ))}
            {customer.notes.length === 0 && <span className="text-sm text-gray-500">No notes</span>}
          </div>
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              const content = noteDraft.trim()
              if (!content) return
              setNoteDraft('')
              addNote(content)
            }}
          >
            <textarea
              className="w-full rounded border p-2 text-sm"
              rows={4}
              placeholder="Add note…"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <button
              type="submit"
              className="h-9 rounded bg-blue-600 px-3 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              disabled={!noteDraft.trim()}
            >
              Add note
            </button>
          </form>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Points</h2>
        <div className="mt-2 text-sm text-gray-700">
          Current balance: <span className="font-semibold">{pointsBalance ?? '-'}</span>
        </div>
        <form
          className="mt-3 grid gap-2 md:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const amount = Number(pointsAmount)
            if (!Number.isFinite(amount) || amount === 0) return
            const res = await fetch(`/api/inbox/customers/${customer.id}/points`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
              body: JSON.stringify({
                amount: Math.trunc(amount),
                description: pointsDescription.trim() || null,
              }),
            })
            if (!res.ok) {
              const j = await safeJson(res)
              setError(j?.error?.message ?? 'Failed to update points')
              return
            }
            setPointsAmount('')
            setPointsDescription('')
            await refreshPoints(customer.id)
          }}
        >
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Amount (e.g. 10 or -5)"
            value={pointsAmount}
            onChange={(e) => setPointsAmount(e.target.value)}
          />
          <input
            className="h-10 rounded border px-3 text-sm md:col-span-2"
            placeholder="Description (optional)"
            value={pointsDescription}
            onChange={(e) => setPointsDescription(e.target.value)}
          />
          <button
            type="submit"
            className="h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 md:col-span-3"
            disabled={!pointsAmount.trim()}
          >
            Apply
          </button>
        </form>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Custom fields</h2>
        {customFields.length === 0 ? (
          <div className="mt-2 text-sm text-gray-500">No custom fields</div>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const values: Record<string, string> = {}
              for (const f of customFields) values[f.id] = f.value
              const res = await fetch(`/api/inbox/customers/${customer.id}/custom-fields`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
                body: JSON.stringify({ values }),
              })
              if (!res.ok) {
                const j = await safeJson(res)
                setError(j?.error?.message ?? 'Failed to update custom fields')
                return
              }
              await refreshCustomFields(customer.id)
            }}
          >
            {customFields.map((f, idx) => (
              <div key={f.id} className="grid gap-2 md:grid-cols-3">
                <div className="text-sm font-medium text-gray-900 md:col-span-1">
                  {f.name}{' '}
                  {f.isRequired && <span className="text-xs text-red-600">*</span>}
                </div>
                <div className="md:col-span-2">
                  {f.fieldType === 'DROPDOWN' ? (
                    <select
                      className="h-10 w-full rounded border px-3 text-sm"
                      value={f.value}
                      onChange={(e) => {
                        const v = e.target.value
                        setCustomFields((prev) => {
                          const next = prev.slice()
                          next[idx] = { ...next[idx], value: v }
                          return next
                        })
                      }}
                    >
                      <option value="">(empty)</option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="h-10 w-full rounded border px-3 text-sm"
                      value={f.value}
                      onChange={(e) => {
                        const v = e.target.value
                        setCustomFields((prev) => {
                          const next = prev.slice()
                          next[idx] = { ...next[idx], value: v }
                          return next
                        })
                      }}
                      placeholder={f.fieldType}
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              type="submit"
              className="h-10 rounded bg-gray-900 px-4 text-sm text-white hover:bg-gray-800"
            >
              Save custom fields
            </button>
          </form>
        )}
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
        <div className="mt-2 divide-y">
          {customer.conversations.map((c) => (
            <Link
              key={c.id}
              href={`/inbox/${c.id}`}
              className="block py-2 text-sm hover:underline"
            >
              {c.id} · {c.status} · {new Date(c.lastMessageAt).toLocaleString()}
            </Link>
          ))}
          {customer.conversations.length === 0 && (
            <div className="py-2 text-sm text-gray-500">No conversations</div>
          )}
        </div>
      </div>
    </div>
  )
}
