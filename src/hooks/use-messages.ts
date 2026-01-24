"use client"

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import type { Message, PaginatedResponse, MessageType } from '@/types'

const MESSAGES_KEY = 'messages'

async function fetchMessages(params: {
  userId: string
  page?: number
  limit?: number
  cursor?: string
}): Promise<PaginatedResponse<Message>> {
  const searchParams = new URLSearchParams()
  
  searchParams.set('userId', params.userId)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.cursor) searchParams.set('cursor', params.cursor)

  const response = await fetch(`/api/inbox/messages?${searchParams}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch messages')
  }
  
  return response.json()
}

export function useMessages(userId: string | null) {
  return useQuery({
    queryKey: [MESSAGES_KEY, userId],
    queryFn: () => fetchMessages({ userId: userId!, limit: 100 }),
    enabled: !!userId,
    staleTime: 10 * 1000, // 10 seconds
  })
}

export function useInfiniteMessages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: [MESSAGES_KEY, 'infinite', userId],
    queryFn: ({ pageParam }) => fetchMessages({
      userId: userId!,
      cursor: pageParam,
      limit: 50,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.cursor || undefined,
    enabled: !!userId,
    staleTime: 10 * 1000,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      userId: string
      content: string
      messageType?: MessageType
      replyToId?: string
      mediaUrl?: string
      metadata?: Record<string, any>
    }) => {
      const response = await fetch('/api/inbox/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      return response.json() as Promise<Message>
    },
    onMutate: async (newMessage) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [MESSAGES_KEY, newMessage.userId] })

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<PaginatedResponse<Message>>([
        MESSAGES_KEY,
        newMessage.userId,
      ])

      // Optimistically update
      if (previousMessages) {
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          userId: newMessage.userId,
          direction: 'outgoing',
          messageType: newMessage.messageType || 'text',
          content: newMessage.content,
          mediaUrl: newMessage.mediaUrl || null,
          metadata: newMessage.metadata || null,
          isRead: true,
          sentBy: null,
          replyToId: newMessage.replyToId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        queryClient.setQueryData<PaginatedResponse<Message>>(
          [MESSAGES_KEY, newMessage.userId],
          {
            ...previousMessages,
            data: [...previousMessages.data, optimisticMessage],
          }
        )
      }

      return { previousMessages }
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          [MESSAGES_KEY, newMessage.userId],
          context.previousMessages
        )
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useMarkMessagesRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/inbox/messages/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!response.ok) throw new Error('Failed to mark messages as read')
      return response.json()
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, userId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
