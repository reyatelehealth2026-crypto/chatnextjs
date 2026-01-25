"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Image as ImageIcon, Sparkles, X } from 'lucide-react'
import { useMessages, useSendMessage } from '@/hooks/use-messages'
import { useConversation } from '@/hooks/use-conversations'
import { useTypingIndicator } from '@/hooks/use-realtime'
import { useAiReply, useAiDraft, useAiAnalyzeImage } from '@/hooks/use-ai'
import { useInboxStore } from '@/stores/inbox'
import { useChatStore } from '@/stores/chat'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { cn, formatMessageTime, getInitials } from '@/lib/utils'
import type { Message } from '@/types'

function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const isOutgoing = message.direction === 'outgoing'
  const [imageError, setImageError] = useState(false)

  return (
    <div
      className={cn(
        'flex gap-2 mb-3 message-bubble',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOutgoing && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isOutgoing
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted rounded-bl-sm'
        )}
      >
        {message.messageType === 'text' && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {message.messageType === 'image' && message.mediaUrl && (
          <div className="relative w-full max-w-[280px] sm:max-w-[360px]">
            {!imageError ? (
              <Image
                src={message.mediaUrl}
                alt="Image"
                width={640}
                height={480}
                sizes="(max-width: 640px) 70vw, 360px"
                className="h-auto w-full rounded-lg"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-muted text-muted-foreground">
                <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-xs">ไม่สามารถโหลดรูปภาพได้</span>
              </div>
            )}
          </div>
        )}

        {message.messageType === 'sticker' && message.metadata && (
          <div className="text-4xl">😊</div>
        )}

        {message.messageType === 'location' && message.metadata && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>{(message.metadata as any).address || 'ตำแหน่ง'}</span>
          </div>
        )}

        {message.messageType === 'file' && (
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            <span>{(message.metadata as any)?.fileName || 'ไฟล์'}</span>
          </div>
        )}

        <div
          className={cn(
            'text-xs mt-1',
            isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {formatMessageTime(message.createdAt)}
          {isOutgoing && message.isRead && ' ✓✓'}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null

  return (
    <div className="flex items-center gap-2 mb-3 text-muted-foreground text-sm">
      <div className="flex gap-1">
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full" />
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full" />
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full" />
      </div>
      <span>
        {names.length === 1 ? names[0] : `${names.length} คน`} กำลังพิมพ์...
      </span>
    </div>
  )
}

function ChatHeader({ conversation }: { conversation: any }) {
  const { toggleProfile, isProfileOpen } = useInboxStore()
  const user = conversation?.user

  if (!user) return null

  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={user.pictureUrl || undefined} 
            onError={(e) => {
              console.warn('Failed to load header profile image');
            }}
          />
          <AvatarFallback>{getInitials(user.displayName || 'U')}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">
            {user.displayName || user.firstName || 'ไม่ระบุชื่อ'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {user.chatStatus === 'active' ? 'ออนไลน์' : 'ออฟไลน์'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Video className="h-4 w-4" />
        </Button>
        <Button
          variant={isProfileOpen ? 'secondary' : 'ghost'}
          size="icon"
          onClick={toggleProfile}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function MessageComposer({ userId, latestImageUrl }: { userId: string; latestImageUrl?: string | null }) {
  const [message, setMessage] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiTone, setAiTone] = useState('friendly')
  const [isAiOpen, setIsAiOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useSendMessage()
  const aiReply = useAiReply()
  const aiDraft = useAiDraft()
  const aiAnalyze = useAiAnalyzeImage()
  const { toast } = useToast()
  const { startTyping, stopTyping } = useTypingIndicator(userId)

  const handleSend = useCallback(async () => {
    if (!message.trim()) return

    try {
      await sendMessage.mutateAsync({
        userId,
        content: message.trim(),
        messageType: 'text',
      })
      setMessage('')
      stopTyping()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }, [message, userId, sendMessage, stopTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)
      startTyping()
    },
    [startTyping]
  )

  const handleAiReply = useCallback(async () => {
    try {
      const result = await aiReply.mutateAsync({ userId, tone: aiTone })
      setAiResult(result.text)
      setIsAiOpen(true)
    } catch (error) {
      toast({ title: 'AI ตอบกลับล้มเหลว', description: 'กรุณาลองใหม่อีกครั้ง' })
    }
  }, [aiReply, aiTone, toast, userId])

  const handleAiDraft = useCallback(async () => {
    try {
      const result = await aiDraft.mutateAsync({ userId, tone: aiTone })
      setAiResult(result.text)
      setIsAiOpen(true)
    } catch (error) {
      toast({ title: 'AI Draft ล้มเหลว', description: 'กรุณาลองใหม่อีกครั้ง' })
    }
  }, [aiDraft, aiTone, toast, userId])

  const handleAiAnalyze = useCallback(async () => {
    if (!latestImageUrl) {
      toast({ title: 'ไม่มีรูปภาพล่าสุด', description: 'ไม่พบรูปภาพในบทสนทนานี้' })
      return
    }
    try {
      const result = await aiAnalyze.mutateAsync({ userId, imageUrl: latestImageUrl })
      setAiResult(result.text)
      setIsAiOpen(true)
    } catch (error) {
      toast({ title: 'วิเคราะห์รูปภาพล้มเหลว', description: 'กรุณาลองใหม่อีกครั้ง' })
    }
  }, [aiAnalyze, latestImageUrl, toast, userId])

  const isAiBusy = aiReply.isPending || aiDraft.isPending || aiAnalyze.isPending

  return (
    <div className="p-4 border-t bg-card">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button size="sm" variant="secondary" onClick={handleAiReply} disabled={isAiBusy}>
          <Sparkles className="h-4 w-4 mr-1" />
          AI Reply
        </Button>
        <Button size="sm" variant="outline" onClick={handleAiDraft} disabled={isAiBusy}>
          Ghost Draft
        </Button>
        <Button size="sm" variant="outline" onClick={handleAiAnalyze} disabled={isAiBusy}>
          วิเคราะห์รูป
        </Button>
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={aiTone}
          onChange={(e) => setAiTone(e.target.value)}
        >
          <option value="friendly">เป็นมิตร</option>
          <option value="professional">มืออาชีพ</option>
          <option value="empathetic">เห็นใจ</option>
        </select>
      </div>

      {isAiOpen && (
        <div className="mb-3 rounded-lg border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Draft</span>
            <Button variant="ghost" size="icon" onClick={() => setIsAiOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={aiResult}
            onChange={(e) => setAiResult(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setMessage(aiResult)}
              disabled={!aiResult.trim()}
            >
              ใส่ในข้อความ
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAiResult('')}>
              ล้าง
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button variant="ghost" size="icon" className="flex-shrink-0">
          <Paperclip className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="flex-shrink-0">
          <ImageIcon className="h-5 w-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ข้อความ..."
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />

        <Button variant="ghost" size="icon" className="flex-shrink-0">
          <Smile className="h-5 w-5" />
        </Button>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || sendMessage.isPending}
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
        <Send className="h-10 w-10 opacity-50" />
      </div>
      <h3 className="text-lg font-medium mb-1">เลือกการสนทนา</h3>
      <p className="text-sm">เลือกการสนทนาจากรายการด้านซ้ายเพื่อเริ่มแชท</p>
    </div>
  )
}

export function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const { selectedConversationId } = useInboxStore()
  const { getTypingUsers } = useChatStore()

  const { data: conversation } = useConversation(selectedConversationId)
  const { data: messagesData, isLoading } = useMessages(selectedConversationId)

  const messages = messagesData?.data || []
  const latestImageUrl = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i]
      if (msg.messageType === 'image' && msg.mediaUrl) {
        return msg.mediaUrl
      }
    }
    return null
  }, [messages])
  const typingUsers = selectedConversationId
    ? getTypingUsers(selectedConversationId)
    : []
  const hasTypingIndicator = typingUsers.length > 0
  const totalRowCount = messages.length + (hasTypingIndicator ? 1 : 0)

  const rowVirtualizer = useVirtualizer({
    count: totalRowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8,
    getItemKey: (index) =>
      index < messages.length ? messages[index].id : 'typing-indicator',
    measureElement: (el) => el.getBoundingClientRect().height,
  })

  // Auto scroll to bottom
  useEffect(() => {
    if (!parentRef.current || totalRowCount === 0) return
    requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(totalRowCount - 1, { align: 'end' })
    })
  }, [rowVirtualizer, totalRowCount])

  if (!selectedConversationId) {
    return <EmptyChat />
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader conversation={conversation} />

      <ScrollArea ref={parentRef} className="flex-1">
        {isLoading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2',
                  i % 2 === 0 ? 'justify-start' : 'justify-end'
                )}
              >
                {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                <Skeleton className="h-16 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>ยังไม่มีข้อความ</p>
            <p className="text-sm">เริ่มการสนทนาโดยส่งข้อความแรก</p>
          </div>
        ) : (
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              width: '100%',
              position: 'relative',
              padding: '16px',
              boxSizing: 'content-box',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              if (virtualRow.index === messages.length) {
                return (
                  <div
                    key="typing-indicator"
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <TypingIndicator names={typingUsers.map((u) => u.name)} />
                  </div>
                )
              }
              const msg = messages[virtualRow.index]
              return (
                <div
                  key={msg.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <MessageBubble
                    message={msg}
                    isLast={virtualRow.index === messages.length - 1}
                  />
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <MessageComposer userId={selectedConversationId} latestImageUrl={latestImageUrl} />
    </div>
  )
}
