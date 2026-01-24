"use client"

import { useState, useMemo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Filter, MessageSquare, RefreshCw } from 'lucide-react'
import { useConversations } from '@/hooks/use-conversations'
import { useInboxStore } from '@/stores/inbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatTimeAgo, truncate, getInitials } from '@/lib/utils'
import type { Conversation } from '@/types'
import { useRef } from 'react'

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
  
  const { 
    selectedConversationId, 
    setSelectedConversation,
    filters,
    setFilters 
  } = useInboxStore()

  const { data, isLoading, isError, refetch, isFetching } = useConversations()

  const conversations = useMemo(() => {
    return data?.data || []
  }, [data])

  const filteredConversations = useMemo(() => {
    if (!searchInput) return conversations
    
    const search = searchInput.toLowerCase()
    return conversations.filter((c) => {
      const name = (c.user.displayName || c.user.firstName || '').toLowerCase()
      const phone = (c.user.phone || '').toLowerCase()
      return name.includes(search) || phone.includes(search)
    })
  }, [conversations, searchInput])

  const rowVirtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 5,
  })

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
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

        {/* Filter badges */}
        {(filters.status !== 'all' || filters.tagId) && (
          <div className="flex items-center gap-2 flex-wrap">
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
            {filters.tagId && (
              <Badge variant="secondary" className="gap-1">
                แท็ก
                <button
                  onClick={() => setFilters({ tagId: undefined })}
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
        ) : filteredConversations.length === 0 ? (
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
              const conversation = filteredConversations[virtualRow.index]
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
