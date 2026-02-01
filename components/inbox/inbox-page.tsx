'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ConversationList } from '@/components/inbox/conversation-list'

function setParam(url: URL, key: string, value: string) {
  const v = value.trim()
  if (!v) url.searchParams.delete(key)
  else url.searchParams.set(key, v)
}

export function InboxPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const status = params.get('status') ?? ''
  const search = params.get('search') ?? ''
  const tag = params.get('tag') ?? ''
  const dateFrom = params.get('dateFrom') ?? ''
  const dateTo = params.get('dateTo') ?? ''

  const urlBase = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    return new URL(pathname, origin)
  }, [pathname])

  const update = (next: Partial<Record<string, string>>) => {
    const url = new URL(urlBase.toString())
    // Keep current params
    for (const [k, v] of params.entries()) url.searchParams.set(k, v)
    for (const [k, v] of Object.entries(next)) setParam(url, k, v ?? '')
    router.replace(`${url.pathname}?${url.searchParams.toString()}`)
  }

  const activeFilters = [
    status ? { key: 'status', label: `Status: ${status}` } : null,
    search ? { key: 'search', label: `Search: ${search}` } : null,
    tag ? { key: 'tag', label: `Tag: ${tag}` } : null,
    dateFrom ? { key: 'dateFrom', label: `From: ${dateFrom}` } : null,
    dateTo ? { key: 'dateTo', label: `To: ${dateTo}` } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>

  return (
    <div className="flex flex-col h-full" id="main">
      <div className="p-6 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">รายการสนทนา</h1>
        <p className="mt-2 text-gray-600">
          จัดการการสนทนากับลูกค้าและข้อความ
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-6">
          <select
            className="h-10 rounded border px-3 text-sm md:col-span-1"
            value={status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="OPEN">เปิด</option>
            <option value="PENDING">รอดำเนินการ</option>
            <option value="RESOLVED">แก้ไขแล้ว</option>
            <option value="CLOSED">ปิด</option>
          </select>
          <input
            className="h-10 rounded border px-3 text-sm md:col-span-2"
            placeholder="ค้นหาลูกค้า/ข้อความ..."
            value={search}
            onChange={(e) => update({ search: e.target.value })}
          />
          <input
            className="h-10 rounded border px-3 text-sm md:col-span-1"
            placeholder="ค้นหาด้วยแท็ก..."
            value={tag}
            onChange={(e) => update({ tag: e.target.value })}
          />
          <input
            className="h-10 rounded border px-3 text-sm md:col-span-1"
            placeholder="จากวันที่ (YYYY-MM-DD)"
            value={dateFrom}
            onChange={(e) => update({ dateFrom: e.target.value })}
          />
          <input
            className="h-10 rounded border px-3 text-sm md:col-span-1"
            placeholder="ถึงวันที่ (YYYY-MM-DD)"
            value={dateTo}
            onChange={(e) => update({ dateTo: e.target.value })}
          />
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                className="rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                onClick={() => update({ [f.key]: '' })}
                title="ลบตัวกรอง"
              >
                {f.label} ✕
              </button>
            ))}
            <button
              type="button"
              className="rounded-full bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-800"
              onClick={() =>
                router.replace(pathname)
              }
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <ConversationList />
      </div>
    </div>
  )
}
