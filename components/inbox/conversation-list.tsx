'use client'

import { useCallback, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ConversationCard } from '@/components/inbox/conversation-card'
import { getCsrfToken } from '@/lib/csrf-client'

interface Customer {
  id: string
  displayName: string
  pictureUrl: string | null
  lineUserId: string
}

interface Assignee {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
}

interface LastMessage {
  id: string
  content: string
  direction: string
  messageType: string
  createdAt: string
}

interface Conversation {
  id: string
  status: string
  unreadCount: number
  lastMessageAt: string
  firstResponseAt: string | null
  createdAt: string
  customer: Customer
  assignees: Assignee[]
  lastMessage: LastMessage | null
}

interface ConversationListProps {
  initialConversations?: Conversation[]
  query?: {
    status?: string
    search?: string
    tag?: string
    dateFrom?: string
    dateTo?: string
  }
}

type BulkStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'

export function ConversationList({ initialConversations = [] }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<BulkStatus>('OPEN')
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const fetchConversations = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) {
      setIsLoading(true)
    }
    setError(null)

    try {
      // Re-read URL params so list stays in sync when FilterBar updates the URL.
      const url = new URL('/api/inbox/conversations', window.location.origin)
      for (const [k, v] of new URLSearchParams(window.location.search).entries()) {
        if (['status', 'search', 'tag', 'dateFrom', 'dateTo', 'assigneeId', 'customerId'].includes(k)) {
          url.searchParams.set(k, v)
        }
      }

      const response = await fetch(url.toString())

        if (!response.ok) {
          throw new Error('Failed to fetch conversations')
        }

        const json = await response.json()
        const next: Conversation[] = json?.data?.conversations || []
        setConversations(next)

        // Keep selection consistent if items disappear.
        setSelectedIds((prev) => {
          if (prev.size === 0) return prev
          const ids = new Set(next.map((c) => c.id))
          const filtered = new Set<string>()
          for (const id of prev) if (ids.has(id)) filtered.add(id)
          return filtered
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [])

  // Fetch conversations on load
  useEffect(() => {
    fetchConversations(true)
  }, [fetchConversations])

  // Subscribe to real-time updates via SSE
  useEffect(() => {
    const source = new EventSource('/api/inbox/events')
    const refresh = () => {
      fetchConversations()
    }

    source.addEventListener('conversation-updated', refresh)
    source.addEventListener('new-message', refresh)
    source.addEventListener('status-updated', refresh)
    source.addEventListener('assignees-updated', refresh)
    source.addEventListener('customer-updated', refresh)

    return () => {
      source.close()
    }
  }, [fetchConversations])

  // Virtual scrolling setup
  const [parentRef, setParentRef] = useState<HTMLDivElement | null>(null)
  
  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef,
    estimateSize: () => 100,
    overscan: 5,
  })

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No conversations found</div>
      </div>
    )
  }

  const toggleSelected = (conversationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(conversationId)) next.delete(conversationId)
      else next.add(conversationId)
      return next
    })
  }

  const clearSelected = () => setSelectedIds(new Set())

  const applyBulkStatus = async () => {
    const conversationIds = Array.from(selectedIds)
    if (conversationIds.length === 0) return

    setIsBulkUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/inbox/conversations/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ conversationIds, status: bulkStatus }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error?.message ?? 'Failed to update status')
      }
      clearSelected()
      await fetchConversations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 border-b bg-white p-3">
          <div className="text-sm text-gray-700">
            Selected: <span className="font-semibold">{selectedIds.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded border px-2 text-sm"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as BulkStatus)}
            >
              <option value="OPEN">เปิด</option>
              <option value="PENDING">รอดำเนินการ</option>
              <option value="RESOLVED">แก้ไขแล้ว</option>
              <option value="CLOSED">ปิด</option>
            </select>
            <button
              type="button"
              className="h-9 rounded bg-blue-600 px-3 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              onClick={applyBulkStatus}
              disabled={isBulkUpdating}
            >
              Apply
            </button>
            <button
              type="button"
              className="h-9 rounded border px-3 text-sm hover:bg-gray-50"
              onClick={clearSelected}
              disabled={isBulkUpdating}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div ref={setParentRef} className="flex-1 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const conversation = conversations[virtualItem.index]
          
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ConversationCard
                conversation={conversation}
                showSelect
                selected={selectedIds.has(conversation.id)}
                onToggleSelect={toggleSelected}
              />
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
