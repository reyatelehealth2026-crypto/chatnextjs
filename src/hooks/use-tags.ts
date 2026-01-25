"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserTag } from '@/types'
import { queryKeys } from '@/lib/query-keys'

interface TagWithCount extends UserTag {
  usageCount: number
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags(),
    queryFn: async () => {
      const response = await fetch('/api/inbox/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      return data.data as TagWithCount[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { name: string; color?: string; description?: string }) => {
      const response = await fetch('/api/inbox/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) throw new Error('Failed to create tag')
      return response.json() as Promise<UserTag>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags() })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tagId: string) => {
      const response = await fetch(`/api/inbox/tags?tagId=${tagId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete tag')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags() })
    },
  })
}

export function useAssignTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { userId: string; tagId: string }) => {
      const response = await fetch('/api/inbox/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, action: 'assign' }),
      })
      if (!response.ok) throw new Error('Failed to assign tag')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags() })
      queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot() })
    },
  })
}

export function useRemoveTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { userId: string; tagId: string }) => {
      const response = await fetch('/api/inbox/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, action: 'remove' }),
      })
      if (!response.ok) throw new Error('Failed to remove tag')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags() })
      queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot() })
    },
  })
}
