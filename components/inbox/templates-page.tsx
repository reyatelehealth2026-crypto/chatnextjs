'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCsrfToken } from '@/lib/csrf-client'

type TemplateRow = {
  id: string
  title: string
  category: string | null
  shortcuts: string[]
  variables: string[]
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

export function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [shortcuts, setShortcuts] = useState('')

  const refresh = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/inbox/templates')
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch templates')
      }
      const j = await res.json()
      setTemplates(j?.data?.templates ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch templates')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const createTemplate = async () => {
    setError(null)
    const res = await fetch('/api/inbox/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        title,
        content,
        category: category.trim() || null,
        shortcuts: shortcuts
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        variables: [],
      }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to create template')
      return
    }
    setTitle('')
    setContent('')
    setCategory('')
    setShortcuts('')
    await refresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">Templates</h1>
        <p className="mt-1 text-sm text-gray-600">Quick reply templates</p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create template</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            className="h-10 rounded border px-3 text-sm md:col-span-2"
            placeholder="Shortcuts (comma separated), e.g. /hi,/promo"
            value={shortcuts}
            onChange={(e) => setShortcuts(e.target.value)}
          />
          <textarea
            className="rounded border p-3 text-sm md:col-span-2"
            rows={4}
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="mt-3 h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          onClick={createTemplate}
          disabled={!title.trim() || !content.trim()}
        >
          Create
        </button>
      </div>

      <div className="rounded border bg-white">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold text-gray-900">All templates</h2>
        </div>
        {isLoading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="p-4 text-gray-500">No templates</div>
        ) : (
          <div className="divide-y">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/inbox/templates/${t.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">{t.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                      {t.category && <span className="rounded bg-gray-100 px-2 py-0.5">{t.category}</span>}
                      {t.shortcuts.map((s) => (
                        <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Used: {t.usageCount}</div>
                    <div>{new Date(t.updatedAt).toLocaleString()}</div>
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
