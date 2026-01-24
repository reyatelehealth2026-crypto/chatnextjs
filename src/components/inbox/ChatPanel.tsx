"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Image as ImageIcon } from 'lucide-react'
import { useMessages, useSendMessage } from '@/hooks/use-messages'
import { useConversation } from '@/hooks/use-conversations'
import { useTypingIndicator } from '@/hooks/use-realtime'
import { useInboxStore } from '@/stores/inbox'
import { useChatStore } from '@/stores/chat'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatMessageTime, getInitials } from '@/lib/utils'
import type { Message } from '@/types'

function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const isOutgoing = message.direction === 'outgoing'

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
          <img
            src={message.mediaUrl}
            alt="Image"
            className="max-w-full rounded-lg"
            loading="lazy"
          />
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
          <AvatarImage src={user.pictureUrl || undefined} />
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

function MessageComposer({ userId }: { userId: string }) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useSendMessage()
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

  return (
    <div className="p-4 border-t bg-card">
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
  const { selectedConversationId } = useInboxStore()
  const { getTypingUsers } = useChatStore()

  const { data: conversation } = useConversation(selectedConversationId)
  const { data: messagesData, isLoading } = useMessages(selectedConversationId)

  const messages = messagesData?.data || []
  const typingUsers = selectedConversationId
    ? getTypingUsers(selectedConversationId)
    : []

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!selectedConversationId) {
    return <EmptyChat />
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader conversation={conversation} />

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
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
          <>
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={index === messages.length - 1}
              />
            ))}
            <TypingIndicator names={typingUsers.map((u) => u.name)} />
            <div ref={messagesEndRef} />
          </>
        )}
      </ScrollArea>

      <MessageComposer userId={selectedConversationId} />
    </div>
  )
}
