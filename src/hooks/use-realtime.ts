"use client"

import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SSEEvent, NewMessageEvent, ConversationUpdateEvent, TypingEvent } from '@/types'
import { useChatStore } from '@/stores/chat'

interface UseRealtimeOptions {
  onNewMessage?: (event: NewMessageEvent) => void
  onConversationUpdate?: (event: ConversationUpdateEvent) => void
  onTyping?: (event: TypingEvent) => void
  enabled?: boolean
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { onNewMessage, onConversationUpdate, onTyping, enabled = true } = options
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addTypingUser, removeTypingUser } = useChatStore()

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return

    try {
      const eventSource = new EventSource('/api/inbox/realtime')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
        console.log('SSE connected')
      }

      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data)

          switch (data.type) {
            case 'new_message':
              const messageEvent = data.data as NewMessageEvent
              // Invalidate queries
              queryClient.invalidateQueries({ queryKey: ['messages', messageEvent.conversationId] })
              queryClient.invalidateQueries({ queryKey: ['conversations'] })
              onNewMessage?.(messageEvent)
              break

            case 'conversation_update':
              const updateEvent = data.data as ConversationUpdateEvent
              queryClient.invalidateQueries({ queryKey: ['conversations'] })
              onConversationUpdate?.(updateEvent)
              break

            case 'typing':
              const typingEvent = data.data as TypingEvent
              if (typingEvent.isTyping) {
                addTypingUser(typingEvent.conversationId, {
                  id: typingEvent.userId,
                  name: typingEvent.userName,
                  timestamp: Date.now(),
                })
              } else {
                removeTypingUser(typingEvent.conversationId, typingEvent.userId)
              }
              onTyping?.(typingEvent)
              break

            case 'ping' as any:
              // Keep-alive ping, ignore
              break

            default:
              console.log('Unknown SSE event:', data.type)
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('SSE error:', err)
        setIsConnected(false)
        setError('Connection lost')
        eventSource.close()
        eventSourceRef.current = null

        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 5000)
      }
    } catch (err) {
      console.error('Failed to connect SSE:', err)
      setError('Failed to connect')
    }
  }, [enabled, queryClient, onNewMessage, onConversationUpdate, onTyping, addTypingUser, removeTypingUser])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  }
}

// Hook for sending typing indicators
export function useTypingIndicator(conversationId: string | null) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  const sendTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || isTypingRef.current === isTyping) return

    isTypingRef.current = isTyping

    try {
      await fetch('/api/inbox/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, isTyping }),
      })
    } catch (err) {
      console.error('Failed to send typing indicator:', err)
    }
  }, [conversationId])

  const startTyping = useCallback(() => {
    sendTyping(true)

    // Auto-stop after 5 seconds of inactivity
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      sendTyping(false)
    }, 5000)
  }, [sendTyping])

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    sendTyping(false)
  }, [sendTyping])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (isTypingRef.current) {
        sendTyping(false)
      }
    }
  }, [sendTyping])

  return { startTyping, stopTyping }
}
