'use client'

import { useState } from 'react'

type FileAttachment = {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  thumbnailUrl: string | null
  createdAt: string
}

type Message = {
  id: string
  content: string
  direction: 'INBOUND' | 'OUTBOUND'
  messageType: string
  metadata?: any
  createdAt: string
  attachments?: FileAttachment[]
  sender?: {
    id: string
    name: string | null
    email: string
  } | null
}

export function MessageBubble({ message }: { message: Message }) {
  const [imageError, setImageError] = useState(false)

  const isOutbound = message.direction === 'OUTBOUND'

  // Determine bubble colors
  const bubbleClass = isOutbound
    ? 'bg-gray-900 text-white'
    : 'bg-gray-100 text-gray-900'

  return (
    <div
      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
      title={new Date(message.createdAt).toLocaleString()}
    >
      <div className={`max-w-[80%] rounded px-3 py-2 text-sm ${bubbleClass}`}>
        {/* Image Message */}
        {message.messageType === 'IMAGE' && message.attachments?.[0] && !imageError ? (
          <div className="space-y-1">
            <img
              src={message.attachments[0].thumbnailUrl || message.attachments[0].url}
              alt="Image"
              className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.attachments![0].url, '_blank')}
              onError={() => setImageError(true)}
              loading="lazy"
            />
            {message.content && message.content !== '[Image]' && (
              <div className="mt-1">{message.content}</div>
            )}
          </div>
        ) : message.messageType === 'VIDEO' && message.attachments?.[0] ? (
          <div className="space-y-1">
            <video
              src={message.attachments[0].url}
              controls
              className="max-w-full rounded"
              poster={message.attachments[0].thumbnailUrl || undefined}
            />
            {message.content && message.content !== '[Video]' && (
              <div className="mt-1">{message.content}</div>
            )}
          </div>
        ) : message.messageType === 'AUDIO' && message.attachments?.[0] ? (
          <div className="space-y-1">
            <audio src={message.attachments[0].url} controls className="w-full" />
            {message.content && message.content !== '[Audio]' && (
              <div className="mt-1">{message.content}</div>
            )}
          </div>
        ) : message.messageType === 'FILE' && message.attachments?.[0] ? (
          <a
            href={message.attachments[0].url}
            download={message.attachments[0].fileName}
            className="flex items-center gap-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="text-lg">📎</span>
            <div className="flex-1 min-w-0">
              <div className="truncate">{message.attachments[0].fileName}</div>
              <div className="text-xs opacity-75">
                {(message.attachments[0].fileSize / 1024).toFixed(1)} KB
              </div>
            </div>
          </a>
        ) : message.messageType === 'LOCATION' && message.metadata ? (
          <div className="space-y-1">
            <div className="font-semibold">
              {message.metadata.title || 'Location'}
            </div>
            {message.metadata.address && (
              <div className="text-xs opacity-90">{message.metadata.address}</div>
            )}
            <a
              href={`https://maps.google.com/?q=${message.metadata.latitude},${message.metadata.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline hover:opacity-80"
            >
              View on Google Maps →
            </a>
          </div>
        ) : (
          /* Text or fallback */
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        )}

        {/* Show error fallback for failed images */}
        {message.messageType === 'IMAGE' && imageError && (
          <div className="text-xs opacity-75">
            [Image unavailable]
            {message.attachments?.[0] && (
              <div>
                <a
                  href={message.attachments[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80"
                >
                  Try opening directly
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
