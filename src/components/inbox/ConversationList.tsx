"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Filter, MessageSquare, RefreshCw } from 'lucide-react'
import { useConversations } from '@/hooks/use-conversations'
import { useTags } from '@/hooks/use-tags'
import { useAdmins } from '@/hooks/use-admins'
import { useInboxStore } from '@/stores/inbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { cn, formatTimeAgo, truncate, getInitials } from '@/lib/utils'
import type { Conversation } from '@/types'

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const { user, lastMessage, unreadCount, tags } = conversation

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 cursor-pointer transition-colors border-b',
        isSelected
          ? 'bg-accent border-l-2 border-l-primary'
          : 'hover:bg-muted/50'
      )}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={user.pictureUrl || undefined} alt={user.displayName || 'User'} />
        <AvatarFallback>{getInitials(user.displayName || 'U')}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">
            {user.displayName || user.firstName || 'ไม่ระบุชื่อ'}
          </span>
          {lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTimeAgo(lastMessage.createdAt)}
            </span>
          )}
        </div>

        {lastMessage && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {lastMessage.direction === 'outgoing' && (
              <span className="text-primary">คุณ: </span>
            )}
            {lastMessage.messageType === 'text'
              ? truncate(lastMessage.content || '', 50)
              : `[${lastMessage.messageType}]`}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs px-1.5 py-0"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {unreadCount > 0 && (
        <Badge variant="destructive" className="flex-shrink-0">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </div>
  )
}

function ConversationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 border-b">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}

export function ConversationList() {
  const parentRef = useRef<HTMLDivElement>(null)
  const [searchInput, setSearchInput] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  const { 
    selectedConversationId, 
    setSelectedConversation,
    filters,
    setFilters,
    resetFilters
  } = useInboxStore()

  const { data, isLoading, isError, refetch, isFetching } = useConversations()
  const { data: tags = [] } = useTags()
  const { data: admins = [] } = useAdmins()

  const conversations = useMemo(() => {
    return data?.data || []
  }, [data])

  const activeTagIds = useMemo(() => {
    if (filters.tagIds && filters.tagIds.length > 0) return filters.tagIds
    if (filters.tagId) return [filters.tagId]
    return []
  }, [filters.tagId, filters.tagIds])

  const assignedAdminLabel = useMemo(() => {
    if (!filters.assignedTo) return null
    const admin = admins.find((item) => item.id === filters.assignedTo)
    return admin?.displayName || admin?.username || 'ผู้ดูแล'
  }, [admins, filters.assignedTo])

  const rowVirtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 5,
  })

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  useEffect(() => {
    setSearchInput(filters.search || '')
  }, [filters.search])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        setFilters({ search: searchInput })
      }
    }, 350)

    return () => clearTimeout(timeout)
  }, [filters.search, searchInput, setFilters])

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversation(id)
  }, [setSelectedConversation])

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            แชท
            {data?.pagination.total !== undefined && (
              <Badge variant="secondary" className="ml-1">
                {data.pagination.total}
              </Badge>
            )}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant={isFilterOpen ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setIsFilterOpen((open) => !open)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter panel */}
        {isFilterOpen && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ตัวกรอง</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetFilters()
                  setSearchInput('')
                }}
              >
                ล้างตัวกรอง
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="status-filter">สถานะ</Label>
                <select
                  id="status-filter"
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  value={filters.status || 'all'}
                  onChange={(e) => setFilters({ status: e.target.value as any })}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="active">กำลังคุย</option>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="resolved">เสร็จสิ้น</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="assignee-filter">ผู้ดูแล</Label>
                <select
                  id="assignee-filter"
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  value={filters.assignedTo || ''}
                  onChange={(e) =>
                    setFilters({
                      assignedTo: e.target.value || undefined,
                      assignedToIds: undefined,
                    })
                  }
                >
                  <option value="">ทั้งหมด</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.displayName || admin.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>แท็ก</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isActive = activeTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const next = isActive
                          ? activeTagIds.filter((id) => id !== tag.id)
                          : [...activeTagIds, tag.id]
                        setFilters({ tagIds: next.length > 0 ? next : undefined, tagId: undefined })
                      }}
                      className={cn(
                        'text-xs px-2 py-1 rounded-full border transition-colors',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-background'
                      )}
                      style={!isActive ? { borderColor: tag.color, color: tag.color } : undefined}
                    >
                      {tag.name}
                    </button>
                  )
                })}
                {tags.length === 0 && (
                  <span className="text-xs text-muted-foreground">ไม่มีแท็ก</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="start-date">วันที่เริ่มต้น</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters({ startDate: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date">วันที่สิ้นสุด</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => setFilters({ endDate: e.target.value || undefined })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.unreadOnly || false}
                onChange={(e) => setFilters({ unreadOnly: e.target.checked })}
              />
              เฉพาะที่ยังไม่ได้อ่าน
            </label>
          </div>
        )}

        {/* Filter badges */}
        {(filters.status !== 'all' ||
          activeTagIds.length > 0 ||
          filters.search ||
          filters.assignedTo ||
          filters.unreadOnly ||
          filters.startDate ||
          filters.endDate) && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                ค้นหา: {filters.search}
                <button
                  onClick={() => setFilters({ search: '' })}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.status && filters.status !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                สถานะ: {filters.status}
                <button
                  onClick={() => setFilters({ status: 'all' })}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {activeTagIds.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                แท็ก: {activeTagIds.length}
                <button
                  onClick={() => setFilters({ tagId: undefined, tagIds: undefined })}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.assignedTo && (
              <Badge variant="secondary" className="gap-1">
                ผู้ดูแล: {assignedAdminLabel || 'ผู้ดูแล'}
                <button
                  onClick={() => setFilters({ assignedTo: undefined, assignedToIds: undefined })}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.unreadOnly && (
              <Badge variant="secondary" className="gap-1">
                ยังไม่อ่าน
                <button
                  onClick={() => setFilters({ unreadOnly: false })}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {(filters.startDate || filters.endDate) && (
              <Badge variant="secondary" className="gap-1">
                ช่วงเวลา
                <button
                  onClick={() => setFilters({ startDate: undefined, endDate: undefined })}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <ScrollArea ref={parentRef} className="flex-1">
        {isLoading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
            <Button variant="link" onClick={() => refetch()}>
              ลองใหม่
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p>ไม่พบการสนทนา</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const conversation = conversations[virtualRow.index]
              return (
                <div
                  key={conversation.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ConversationItem
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
