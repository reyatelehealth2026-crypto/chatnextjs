"use client"

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import type { Conversation, PaginatedResponse } from '@/types'
import { useInboxStore } from '@/stores/inbox'
import { queryKeys } from '@/lib/query-keys'

async function fetchConversations(params: {
  page?: number
  limit?: number
  cursor?: string
  status?: string
  tagId?: string
  tagIds?: string[]
  search?: string
  assignedTo?: string
  assignedToIds?: string[]
  unreadOnly?: boolean
  startDate?: string
  endDate?: string
}): Promise<PaginatedResponse<Conversation>> {
  const searchParams = new URLSearchParams()
  
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.cursor) searchParams.set('cursor', params.cursor)
  if (params.status && params.status !== 'all') searchParams.set('status', params.status)
  if (params.tagId) searchParams.set('tagId', params.tagId)
  if (params.tagIds && params.tagIds.length > 0) {
    searchParams.set('tagIds', params.tagIds.join(','))
  }
  if (params.search) searchParams.set('search', params.search)
  if (params.assignedTo) searchParams.set('assignedTo', params.assignedTo)
  if (params.assignedToIds && params.assignedToIds.length > 0) {
    searchParams.set('assignedToIds', params.assignedToIds.join(','))
  }
  if (params.unreadOnly) searchParams.set('unreadOnly', 'true')
  if (params.startDate) searchParams.set('startDate', params.startDate)
  if (params.endDate) searchParams.set('endDate', params.endDate)

  const response = await fetch(`/api/inbox/conversations?${searchParams}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch conversations')
  }
  
  return response.json()
}

export function useConversations() {
  const filters = useInboxStore((state) => state.filters)

  return useQuery({
    queryKey: queryKeys.conversations(filters),
    queryFn: () => fetchConversations({
      status: filters.status,
      tagId: filters.tagId,
      tagIds: filters.tagIds,
      search: filters.search,
      assignedTo: filters.assignedTo,
      assignedToIds: filters.assignedToIds,
      unreadOnly: filters.unreadOnly,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: 50,
    }),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useInfiniteConversations() {
  const filters = useInboxStore((state) => state.filters)

  return useInfiniteQuery({
    queryKey: queryKeys.conversationsInfinite(filters),
    queryFn: ({ pageParam }) => fetchConversations({
      cursor: pageParam,
      status: filters.status,
      tagId: filters.tagId,
      tagIds: filters.tagIds,
      search: filters.search,
      assignedTo: filters.assignedTo,
      assignedToIds: filters.assignedToIds,
      unreadOnly: filters.unreadOnly,
      startDate: filters.startDate,
      endDate: filters.endDate,
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
    queryKey: queryKeys.conversation(id),
    queryFn: async () => {
      // Try to get from cache first
      const cachedQueries = queryClient.getQueriesData<PaginatedResponse<Conversation>>({
        queryKey: queryKeys.conversationsRoot(),
      })
      for (const [, cached] of cachedQueries) {
        const conversation = cached?.data.find((c) => c.id === id)
        if (conversation) {
          return conversation
        }
      }

      // Fetch if not in cache
      const response = await fetch(`/api/inbox/conversations/${id}`)
      if (!response.ok) throw new Error('Failed to fetch conversation')
      const data = await response.json()
      return data.data as Conversation
    },
    enabled: !!id,
  })
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await fetch(`/api/inbox/conversations/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatStatus: status }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      return response.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot() })
      queryClient.invalidateQueries({ queryKey: queryKeys.customerProfile(variables.userId) })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot() })
    },
  })
}

export function useUnassignConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, adminId }: { userId: string; adminId: string }) => {
      const response = await fetch(
        `/api/inbox/assignments?userId=${userId}&adminId=${adminId}`,
        {
          method: 'DELETE',
        }
      )
      if (!response.ok) throw new Error('Failed to unassign conversation')
      return response.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot() })
      queryClient.invalidateQueries({ queryKey: queryKeys.customerProfile(variables.userId) })
    },
  })
}
