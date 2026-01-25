import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConversationList } from '@/components/inbox/ConversationList'

const mockSetSelectedConversation = vi.fn()
const mockSetFilters = vi.fn()
const mockResetFilters = vi.fn()

vi.mock('@/stores/inbox', () => ({
  useInboxStore: () => ({
    selectedConversationId: 'c-1',
    setSelectedConversation: mockSetSelectedConversation,
    filters: {
      status: 'all',
      search: 'Alice',
      tagId: undefined,
      tagIds: [],
      assignedTo: undefined,
      assignedToIds: undefined,
      unreadOnly: false,
      startDate: undefined,
      endDate: undefined,
    },
    setFilters: mockSetFilters,
    resetFilters: mockResetFilters,
  }),
}))

vi.mock('@/hooks/use-conversations', () => ({
  useConversations: () => ({
    data: {
      data: [
        {
          id: 'c-1',
          user: {
            id: 'u-1',
            lineUserId: 'line-1',
            displayName: 'Alice',
            pictureUrl: null,
            statusMessage: null,
            firstName: null,
            lastName: null,
            phone: null,
            email: null,
            birthDate: null,
            gender: null,
            address: null,
            province: null,
            membershipLevel: 'standard',
            tier: 'standard',
            points: 10,
            totalSpent: 0,
            orderCount: 0,
            lastInteraction: null,
            chatStatus: 'active',
            isBlocked: false,
            isRegistered: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          lastMessage: {
            id: 'm-1',
            userId: 'u-1',
            direction: 'incoming',
            messageType: 'text',
            content: 'hello',
            mediaUrl: null,
            metadata: null,
            isRead: false,
            sentBy: null,
            replyToId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          unreadCount: 1,
          status: 'active',
          assignees: [],
          tags: [],
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, page: 1, limit: 50 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isFetching: false,
  }),
}))

vi.mock('@/hooks/use-tags', () => ({
  useTags: () => ({ data: [] }),
}))

vi.mock('@/hooks/use-admins', () => ({
  useAdmins: () => ({ data: [] }),
}))

describe('ConversationList integration', () => {
  it('renders conversations and active search badge', () => {
    render(<ConversationList />)

    expect(screen.getByText('แชท')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText(/ค้นหา:/)).toBeInTheDocument()
  })
})
