'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getCsrfToken } from '@/lib/csrf-client'

type CustomField = {
  id: string
  name: string
  fieldType: string
  isRequired: boolean
  options: string[]
  displayOrder: number
  updatedAt: string
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [name, setName] = useState('')
  const [fieldType, setFieldType] = useState('TEXT')
  const [isRequired, setIsRequired] = useState(false)
  const [options, setOptions] = useState('')

  const orderedIds = useMemo(() => fields.map((f) => f.id), [fields])

  const refresh = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/inbox/custom-fields')
      if (!res.ok) {
        const j = await safeJson(res)
        throw new Error(j?.error?.message ?? 'Failed to fetch fields')
      }
      const j = await res.json()
      setFields(j?.data?.fields ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch fields')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const create = async () => {
    setError(null)
    const res = await fetch('/api/inbox/custom-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        name,
        fieldType,
        isRequired,
        options: fieldType === 'DROPDOWN'
          ? options.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to create field')
      return
    }
    setName('')
    setFieldType('TEXT')
    setIsRequired(false)
    setOptions('')
    await refresh()
  }

  const move = async (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id)
    const nextIdx = idx + dir
    if (idx < 0 || nextIdx < 0 || nextIdx >= fields.length) return
    const next = fields.slice()
    const tmp = next[idx]
    next[idx] = next[nextIdx]
    next[nextIdx] = tmp
    setFields(next)
  }

  const saveOrder = async () => {
    setError(null)
    const res = await fetch('/api/inbox/custom-fields', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ orderedIds }),
    })
    if (!res.ok) {
      const j = await safeJson(res)
      setError(j?.error?.message ?? 'Failed to save order')
      return
    }
    await refresh()
  }

  return (
    <div className="space-y-4">
      <Link href="/inbox/settings" className="text-sm text-blue-600 hover:underline">
        ← Back
      </Link>

      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">Custom fields</h1>
        <p className="mt-1 text-sm text-gray-600">Fields shown on customer profiles</p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create field</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className="h-10 rounded border px-3 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="h-10 rounded border px-3 text-sm"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
          >
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="DATE">Date</option>
            <option value="DROPDOWN">Dropdown</option>
            <option value="CHECKBOX">Checkbox</option>
          </select>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
            />
            Required
          </label>
          {fieldType === 'DROPDOWN' && (
            <input
              className="h-10 rounded border px-3 text-sm md:col-span-2"
              placeholder="Options (comma separated)"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
            />
          )}
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
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold text-gray-900">Field order</h2>
          <button
            type="button"
            className="h-9 rounded bg-gray-900 px-3 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            onClick={saveOrder}
            disabled={fields.length < 2}
          >
            Save order
          </button>
        </div>
        {isLoading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : fields.length === 0 ? (
          <div className="p-4 text-gray-500">No fields</div>
        ) : (
          <div className="divide-y">
            {fields.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900">{f.name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {f.fieldType} · {f.isRequired ? 'Required' : 'Optional'}
                    {f.fieldType === 'DROPDOWN' && f.options.length > 0 && (
                      <> · Options: {f.options.join(', ')}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 rounded border px-3 text-sm hover:bg-gray-50"
                    onClick={() => move(f.id, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="h-9 rounded border px-3 text-sm hover:bg-gray-50"
                    onClick={() => move(f.id, 1)}
                  >
                    Down
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
