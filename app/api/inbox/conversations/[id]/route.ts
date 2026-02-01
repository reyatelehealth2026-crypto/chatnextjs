import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-helpers'

/**
 * GET /api/inbox/conversations/[id]
 * Get conversation details with message history and assignee information
 * 
 * Requirements: 2.4
 */
export const GET = withAuth(async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: conversationId } = await params
    
    // Fetch conversation with all related data
    const conversation = await (prisma as any).conversation.findUnique({
      where: {
        id: conversationId,
        lineAccountId: user.lineAccountId, // Multi-tenant isolation
      },
      include: {
        customer: {
          select: {
            id: true,
            displayName: true,
            pictureUrl: true,
            lineUserId: true,
            statusMessage: true,
            language: true,
            lastContactAt: true,
            createdAt: true,
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
          orderBy: {
            assignedAt: 'asc',
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                url: true,
                thumbnailUrl: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    })
    
    // Return 404 if conversation not found or doesn't belong to user's line account
    if (!conversation) {
      return errorResponse('Conversation not found', 404)
    }
    
    // Format the response
    return successResponse({
      conversation: {
        id: conversation.id,
        status: conversation.status,
        unreadCount: conversation.unreadCount,
        lastMessageAt: conversation.lastMessageAt,
        firstResponseAt: conversation.firstResponseAt,
        resolvedAt: conversation.resolvedAt,
        closedAt: conversation.closedAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        customer: conversation.customer,
        assignees: conversation.assignees.map((a: any) => ({
          ...a.user,
          assignedAt: a.assignedAt,
        })),
        messages: conversation.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          direction: msg.direction,
          messageType: msg.messageType,
          metadata: msg.metadata,
          createdAt: msg.createdAt,
          sender: msg.sender,
          attachments: msg.attachments,
        })),
        statusHistory: conversation.statusHistory.map((history: any) => ({
          id: history.id,
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          changedAt: history.changedAt,
          changedBy: history.user,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching conversation details:', error)
    return errorResponse('Failed to fetch conversation details', 500)
  }
})
