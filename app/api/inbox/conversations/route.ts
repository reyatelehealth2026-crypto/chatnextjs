import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

/**
 * GET /api/inbox/conversations
 * List conversations with pagination and filtering
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by conversation status (OPEN, PENDING, RESOLVED, CLOSED)
 * - assigneeId: Filter by assignee user ID
 * - customerId: Filter by customer ID
 * - tag: Filter by customer tag name (contains, case-insensitive)
 * - dateFrom/dateTo: Filter by lastMessageAt range (ISO date)
 * - search: Search in customer display name and message content
 * 
 * Requirements: 2.1, 2.5
 */
export const GET = withAuth(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit
    
    // Parse filter parameters
    const status = sanitizeText(searchParams.get('status'), { maxLen: 20 }) || null
    const assigneeId = sanitizeText(searchParams.get('assigneeId'), { maxLen: 64 }) || null
    const customerId = sanitizeText(searchParams.get('customerId'), { maxLen: 64 }) || null
    const tag = sanitizeText(searchParams.get('tag'), { maxLen: 60 }) || null
    const dateFromRaw = sanitizeText(searchParams.get('dateFrom'), { maxLen: 32 }) || null
    const dateToRaw = sanitizeText(searchParams.get('dateTo'), { maxLen: 32 }) || null
    const search = sanitizeText(searchParams.get('search'), { maxLen: 200 }) || null
    
    // Build where clause with tenant filtering
    const where: any = {
      lineAccountId: user.lineAccountId, // Multi-tenant isolation
    }
    
    // Apply status filter
    if (status && ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].includes(status)) {
      where.status = status
    }
    
    // Apply customer filter
    if (customerId) {
      where.customerId = customerId
    }
    
    // Apply assignee filter
    if (assigneeId) {
      where.assignees = {
        some: {
          userId: assigneeId,
        },
      }
    }
    
    // Apply search filter
    if (search) {
      where.OR = [
        {
          customer: {
            displayName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          messages: {
            some: {
              content: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ]
    }

    // Apply tag filter
    if (tag) {
      where.customer = {
        ...(where.customer ?? {}),
        tags: {
          some: {
            name: {
              contains: tag,
              mode: 'insensitive',
            },
          },
        },
      }
    }

    // Apply lastMessageAt date range filter
    const dateFrom = dateFromRaw ? new Date(dateFromRaw) : null
    const dateTo = dateToRaw ? new Date(dateToRaw) : null
    const validFrom = dateFrom && !Number.isNaN(dateFrom.getTime()) ? dateFrom : null
    const validTo = dateTo && !Number.isNaN(dateTo.getTime()) ? dateTo : null

    if (validFrom || validTo) {
      where.lastMessageAt = {}
      if (validFrom) where.lastMessageAt.gte = validFrom
      if (validTo) where.lastMessageAt.lte = validTo
    }
    
    // Execute query with pagination
    const [conversations, total] = await Promise.all([
      (prisma as any).conversation.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              displayName: true,
              pictureUrl: true,
              lineUserId: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true,
                },
              },
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              content: true,
              direction: true,
              messageType: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
        skip,
        take: limit,
      }),
      (prisma as any).conversation.count({ where }),
    ])
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1
    
    return successResponse({
      conversations: conversations.map((conv: any) => ({
        id: conv.id,
        status: conv.status,
        unreadCount: conv.unreadCount,
        lastMessageAt: conv.lastMessageAt,
        firstResponseAt: conv.firstResponseAt,
        createdAt: conv.createdAt,
        customer: conv.customer,
        assignees: conv.assignees.map((a: any) => a.user),
        lastMessage: conv.messages[0] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return errorResponse('Failed to fetch conversations', 500)
  }
})
