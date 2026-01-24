"use client"

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import type { Conversation, PaginatedResponse } from '@/types'
import { useInboxStore } from '@/stores/inbox'

const CONVERSATIONS_KEY = 'conversations'

async function fetchConversations(params: {
  page?: number
  limit?: number
  cursor?: string
  status?: string
  tagId?: string
  search?: string
  assignedTo?: string
}): Promise<PaginatedResponse<Conversation>> {
  const searchParams = new URLSearchParams()
  
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.cursor) searchParams.set('cursor', params.cursor)
  if (params.status && params.status !== 'all') searchParams.set('status', params.status)
  if (params.tagId) searchParams.set('tagId', params.tagId)
  if (params.search) searchParams.set('search', params.search)
  if (params.assignedTo) searchParams.set('assignedTo', params.assignedTo)

  const response = await fetch(`/api/inbox/conversations?${searchParams}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch conversations')
  }
  
  return response.json()
}

export function useConversations() {
  const filters = useInboxStore((state) => state.filters)

  return useQuery({
    queryKey: [CONVERSATIONS_KEY, filters],
    queryFn: () => fetchConversations({
      status: filters.status,
      tagId: filters.tagId,
      search: filters.search,
      assignedTo: filters.assignedTo,
      limit: 50,
    }),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useInfiniteConversations() {
  const filters = useInboxStore((state) => state.filters)

  return useInfiniteQuery({
    queryKey: [CONVERSATIONS_KEY, 'infinite', filters],
    queryFn: ({ pageParam }) => fetchConversations({
      cursor: pageParam,
      status: filters.status,
      tagId: filters.tagId,
      search: filters.search,
      assignedTo: filters.assignedTo,
      limit: 20,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.cursor || undefined,
    staleTime: 30 * 1000,
  })
}

export function useConversation(id: string | null) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: [CONVERSATIONS_KEY, id],
    queryFn: async () => {
      // Try to get from cache first
      const cached = queryClient.getQueryData<PaginatedResponse<Conversation>>([CONVERSATIONS_KEY])
      const conversation = cached?.data.find((c) => c.id === id)
      
      if (conversation) {
        return conversation
      }

      // Fetch if not in cache
      const response = await fetch(`/api/inbox/conversations?userId=${id}`)
      if (!response.ok) throw new Error('Failed to fetch conversation')
      const data = await response.json()
      return data.data[0] as Conversation
    },
    enabled: !!id,
  })
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await fetch('/api/inbox/conversations/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] })
    },
  })
}

export function useAssignConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, adminId }: { userId: string; adminId: string }) => {
      const response = await fetch('/api/inbox/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, adminId }),
      })
      if (!response.ok) throw new Error('Failed to assign conversation')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] })
    },
  })
}
