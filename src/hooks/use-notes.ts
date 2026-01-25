"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CustomerNote } from '@/types'
import { queryKeys } from '@/lib/query-keys'

export function useNotes(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notes(userId || ''),
    queryFn: async () => {
      if (!userId) return []
      const response = await fetch(`/api/inbox/notes?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch notes')
      const data = await response.json()
      return data.data as CustomerNote[]
    },
    enabled: !!userId,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { userId: string; content: string; isPinned?: boolean }) => {
      const response = await fetch('/api/inbox/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) throw new Error('Failed to create note')
      return response.json() as Promise<CustomerNote>
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(variables.userId) })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string; content?: string; isPinned?: boolean; userId: string }) => {
      const response = await fetch('/api/inbox/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) throw new Error('Failed to update note')
      return response.json() as Promise<CustomerNote>
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(variables.userId) })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string; userId: string }) => {
      const response = await fetch(`/api/inbox/notes?id=${params.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete note')
      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(variables.userId) })
    },
  })
}
