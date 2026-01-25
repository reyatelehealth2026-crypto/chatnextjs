"use client"

import { useQuery } from '@tanstack/react-query'
import type { CustomerProfile } from '@/types'
import { queryKeys } from '@/lib/query-keys'

export function useCustomerProfile(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.customerProfile(userId),
    queryFn: async () => {
      const response = await fetch(`/api/inbox/customers/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch customer profile')
      const data = await response.json()
      return data.data as CustomerProfile
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}
