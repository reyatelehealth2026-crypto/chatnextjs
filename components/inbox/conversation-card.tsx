'use client'

import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import Image from 'next/image'
import Link from 'next/link'

interface Customer {
  id: string
  displayName: string
  pictureUrl: string | null
  lineUserId: string
}

interface Assignee {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
}

interface LastMessage {
  id: string
  content: string
  direction: string
  messageType: string
  createdAt: string
}

interface Conversation {
  id: string
  status: string
  unreadCount: number
  lastMessageAt: string
  firstResponseAt: string | null
  createdAt: string
  customer: Customer
  assignees: Assignee[]
  lastMessage: LastMessage | null
}

interface ConversationCardProps {
  conversation: Conversation
  showSelect?: boolean
  selected?: boolean
  onToggleSelect?: (conversationId: string) => void
}

const statusColors = {
  OPEN: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-gray-100 text-gray-800',
}

const statusLabels = {
  OPEN: 'Open',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export function ConversationCard({
  conversation,
  showSelect = false,
  selected = false,
  onToggleSelect,
}: ConversationCardProps) {
  const { customer, status, unreadCount, lastMessage, lastMessageAt, assignees } = conversation

  const timeAgo = formatDistanceToNow(new Date(lastMessageAt), {
    addSuffix: true,
    locale: th,
  })

  return (
    <div className="flex items-start gap-3 border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
      {showSelect && (
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={selected}
          onChange={() => onToggleSelect?.(conversation.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select conversation"
        />
      )}

      <Link
        href={`/inbox/${conversation.id}`}
        className="flex flex-1 min-w-0 items-start gap-3"
      >
      {/* Customer Avatar */}
      <div className="relative flex-shrink-0">
        {customer.pictureUrl ? (
          <Image
            src={customer.pictureUrl}
            alt={customer.displayName}
            width={48}
            height={48}
            className="rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {customer.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </div>

      {/* Conversation Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {customer.displayName}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {timeAgo}
          </span>
        </div>

        {/* Last Message */}
        {lastMessage && (
          <p className="text-sm text-gray-600 truncate mb-2">
            {lastMessage.direction === 'outbound' && (
              <span className="text-gray-400 mr-1">You:</span>
            )}
            {lastMessage.messageType === 'TEXT' ? (
              lastMessage.content
            ) : (
              <span className="italic">[{lastMessage.messageType}]</span>
            )}
          </p>
        )}

        {/* Status and Assignees */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              statusColors[status as keyof typeof statusColors] || statusColors.OPEN
            }`}
          >
            {statusLabels[status as keyof typeof statusLabels] || status}
          </span>

          {/* Assignees */}
          {assignees.length > 0 && (
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((assignee) => (
                <div
                  key={assignee.id}
                  className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden"
                  title={assignee.name || assignee.email}
                >
                  {assignee.image ? (
                    <Image
                      src={assignee.image}
                      alt={assignee.name || assignee.email}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-xs text-gray-600">
                      {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </Link>
    </div>
  )
}
