'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCsrfToken } from '@/lib/csrf-client'

type Template = {
  id: string
  title: string
  content: string
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

export function TemplateEditorPage({ templateId }: { templateId: string }) {
  const router = useRouter()
  const [template, setTemplate] = useState<Template | null>(null)
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
      const res = await fetch(`/api/inbox/templates/${templateId}`)
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch template')
      }
      const j = await res.json()
      const t = j?.data?.template as Template
      setTemplate(t)
      setTitle(t.title)
      setContent(t.content)
      setCategory(t.category ?? '')
      setShortcuts(t.shortcuts.join(','))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch template')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const save = async () => {
    setError(null)
    const res = await fetch(`/api/inbox/templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        title,
        content,
        category: category.trim() || null,
        shortcuts: shortcuts
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to save template')
      return
    }
    await refresh()
  }

  const remove = async () => {
    setError(null)
    const res = await fetch(`/api/inbox/templates/${templateId}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': getCsrfToken() },
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to delete template')
      return
    }
    router.push('/inbox/templates')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Link href="/inbox/templates" className="text-sm text-blue-600 hover:underline">
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
        ) : !template ? (
          <div className="text-gray-600">Template not found</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit template</h1>
                <div className="mt-1 text-xs text-gray-500">
                  Used: {template.usageCount} · Updated: {new Date(template.updatedAt).toLocaleString()}
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
                placeholder="Shortcuts (comma separated)"
                value={shortcuts}
                onChange={(e) => setShortcuts(e.target.value)}
              />
              <textarea
                className="rounded border p-3 text-sm md:col-span-2"
                rows={8}
                placeholder="Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="mt-3 h-10 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              onClick={save}
              disabled={!title.trim() || !content.trim()}
            >
              Save
            </button>
          </>
        )}
      </div>
    </div>
  )
}
