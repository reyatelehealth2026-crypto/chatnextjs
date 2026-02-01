import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/inbox/conversations/[id]/route'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    conversation: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock api-helpers
vi.mock('@/lib/api-helpers', () => ({
  withAuth: (handler: any) => handler,
  successResponse: (data: any) => ({
    json: () => Promise.resolve(data),
    status: 200,
  }),
  errorResponse: (message: string, status: number) => ({
    json: () => Promise.resolve({ error: message }),
    status,
  }),
}))

describe('GET /api/inbox/conversations/[id]', () => {
  const mockUser = {
    id: 'user-1',
    lineAccountId: 'account-1',
    email: 'test@example.com',
    role: 'STAFF',
  }

  const mockConversation = {
    id: 'conv-1',
    status: 'OPEN',
    unreadCount: 2,
    lastMessageAt: new Date('2024-01-01'),
    firstResponseAt: new Date('2024-01-01'),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    customer: {
      id: 'customer-1',
      displayName: 'John Doe',
      pictureUrl: 'https://example.com/pic.jpg',
      lineUserId: 'line-user-1',
      statusMessage: 'Hello',
      language: 'en',
      lastContactAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    },
    assignees: [
      {
        assignedAt: new Date('2024-01-01'),
        user: {
          id: 'user-1',
          name: 'Admin User',
          email: 'admin@example.com',
          image: null,
          role: 'ADMIN',
        },
      },
    ],
    messages: [
      {
        id: 'msg-1',
        content: 'Hello',
        direction: 'INBOUND',
        messageType: 'TEXT',
        metadata: null,
        createdAt: new Date('2024-01-01'),
        sender: null,
        attachments: [],
      },
      {
        id: 'msg-2',
        content: 'Hi there!',
        direction: 'OUTBOUND',
        messageType: 'TEXT',
        metadata: null,
        createdAt: new Date('2024-01-01'),
        sender: {
          id: 'user-1',
          name: 'Admin User',
          email: 'admin@example.com',
          image: null,
          role: 'ADMIN',
        },
        attachments: [],
      },
    ],
    statusHistory: [
      {
        id: 'history-1',
        fromStatus: null,
        toStatus: 'OPEN',
        changedAt: new Date('2024-01-01'),
        user: {
          id: 'user-1',
          name: 'Admin User',
          email: 'admin@example.com',
        },
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return conversation details with messages and assignees', async () => {
    const prisma = await import('@/lib/prisma')
    ;(prisma.default as any).conversation.findUnique.mockResolvedValue(mockConversation)

    const request = new NextRequest('http://localhost:3000/api/inbox/conversations/conv-1')
    const response = await GET(mockUser, request, { params: { id: 'conv-1' } })

    expect(prisma.default.conversation.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'conv-1',
        lineAccountId: 'account-1',
      },
      include: expect.objectContaining({
        customer: expect.any(Object),
        assignees: expect.any(Object),
        messages: expect.any(Object),
        statusHistory: expect.any(Object),
      }),
    })

    const data = await response.json()
    expect(data.conversation).toBeDefined()
    expect(data.conversation.id).toBe('conv-1')
    expect(data.conversation.customer.displayName).toBe('John Doe')
    expect(data.conversation.assignees).toHaveLength(1)
    expect(data.conversation.messages).toHaveLength(2)
    expect(data.conversation.statusHistory).toHaveLength(1)
  })

  it('should return 404 when conversation not found', async () => {
    const prisma = await import('@/lib/prisma')
    ;(prisma.default as any).conversation.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/inbox/conversations/invalid-id')
    const response = await GET(mockUser, request, { params: { id: 'invalid-id' } })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Conversation not found')
  })

  it('should enforce multi-tenant isolation', async () => {
    const prisma = await import('@/lib/prisma')
    ;(prisma.default as any).conversation.findUnique.mockResolvedValue(mockConversation)

    const request = new NextRequest('http://localhost:3000/api/inbox/conversations/conv-1')
    await GET(mockUser, request, { params: { id: 'conv-1' } })

    expect(prisma.default.conversation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lineAccountId: 'account-1',
        }),
      })
    )
  })
})
