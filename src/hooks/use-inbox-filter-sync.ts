"use client"

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ConversationFilters } from '@/stores/inbox'
import { useInboxStore } from '@/stores/inbox'

const DEFAULT_FILTERS: ConversationFilters = {
  status: 'all',
  tagId: undefined,
  tagIds: undefined,
  assignedTo: undefined,
  assignedToIds: undefined,
  search: '',
  unreadOnly: false,
  startDate: undefined,
  endDate: undefined,
}

function parseFiltersFromParams(params: URLSearchParams): ConversationFilters {
  const statusParam = params.get('status') || 'all'
  const status =
    statusParam === 'active' || statusParam === 'pending' || statusParam === 'resolved'
      ? statusParam
      : 'all'

  const tagIds = params
    .get('tagIds')
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  const assignedToIds = params
    .get('assignedToIds')
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  return {
    status,
    search: params.get('search') || '',
    tagId: params.get('tagId') || undefined,
    tagIds: tagIds && tagIds.length > 0 ? tagIds : undefined,
    assignedTo: params.get('assignedTo') || undefined,
    assignedToIds: assignedToIds && assignedToIds.length > 0 ? assignedToIds : undefined,
    unreadOnly: params.get('unreadOnly') === 'true' || params.get('unreadOnly') === '1',
    startDate: params.get('startDate') || undefined,
    endDate: params.get('endDate') || undefined,
  }
}

function buildParamsFromFilters(filters: ConversationFilters) {
  const params = new URLSearchParams()

  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.tagId) params.set('tagId', filters.tagId)
  if (filters.tagIds && filters.tagIds.length > 0) {
    params.set('tagIds', filters.tagIds.join(','))
  }
  if (filters.assignedTo) params.set('assignedTo', filters.assignedTo)
  if (filters.assignedToIds && filters.assignedToIds.length > 0) {
    params.set('assignedToIds', filters.assignedToIds.join(','))
  }
  if (filters.unreadOnly) params.set('unreadOnly', 'true')
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)

  return params.toString()
}

function areFiltersEqual(a: ConversationFilters, b: ConversationFilters) {
  return (
    a.status === b.status &&
    a.search === b.search &&
    a.tagId === b.tagId &&
    JSON.stringify(a.tagIds ?? []) === JSON.stringify(b.tagIds ?? []) &&
    a.assignedTo === b.assignedTo &&
    JSON.stringify(a.assignedToIds ?? []) === JSON.stringify(b.assignedToIds ?? []) &&
    a.unreadOnly === b.unreadOnly &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate
  )
}

export function useInboxFilterSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = useInboxStore((state) => state.filters)
  const setAllFilters = useInboxStore((state) => state.setAllFilters)

  const parsedFilters = useMemo(() => {
    if (!searchParams) return DEFAULT_FILTERS
    return parseFiltersFromParams(searchParams)
  }, [searchParams])

  useEffect(() => {
    if (!searchParams || searchParams.toString().length === 0) {
      return
    }

    if (!areFiltersEqual(filters, parsedFilters)) {
      setAllFilters(parsedFilters)
    }
  }, [filters, parsedFilters, searchParams, setAllFilters])

  useEffect(() => {
    const nextParams = buildParamsFromFilters(filters)
    const currentParams = searchParams?.toString() || ''

    if (nextParams === currentParams) return

    const nextUrl = nextParams ? `${pathname}?${nextParams}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [filters, pathname, router, searchParams])
}
