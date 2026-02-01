import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

/**
 * POST /api/inbox/conversations/[id]/assignees
 * DELETE /api/inbox/conversations/[id]/assignees?userId=...
 *
 * Requirements: 4.1, 4.4, 4.7
 */

export const POST = withPermission(
  'assignConversations',
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: conversationId } = await params
      const body = (await request.json().catch(() => null)) as
        | { userId?: unknown }
        | null

      const assigneeId = typeof body?.userId === 'string' ? sanitizeText(body.userId, { maxLen: 64 }) : null
      if (!assigneeId) return errorResponse('userId is required', 400)

      const [conversation, assignee] = await Promise.all([
        prisma.conversation.findUnique({
          where: { id: conversationId, lineAccountId: user.lineAccountId },
          select: { id: true },
        }),
        prisma.user.findUnique({
          where: { id: assigneeId, lineAccountId: user.lineAccountId },
          select: { id: true },
        }),
      ])

      if (!conversation) return errorResponse('Conversation not found', 404)
      if (!assignee) return errorResponse('Assignee not found', 404)

      await prisma.conversationAssignee.create({
        data: { conversationId, userId: assigneeId },
      })

      sendSseEvent(user.lineAccountId, 'assignees-updated', { conversationId })
      sendSseEvent(user.lineAccountId, 'conversation-updated', { conversationId })

      return successResponse({ ok: true }, 201)
    } catch (error: any) {
      // Unique constraint: already assigned.
      if (typeof error?.code === 'string' && error.code === 'P2002') {
        return successResponse({ ok: true }, 200)
      }
      console.error('Error assigning conversation:', error)
      return errorResponse('Failed to assign conversation', 500)
    }
  }
)

export const DELETE = withPermission(
  'assignConversations',
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: conversationId } = await params
      const { searchParams } = new URL(request.url)
      const assigneeId = sanitizeText(searchParams.get('userId'), { maxLen: 64 })

      if (!assigneeId) return errorResponse('userId is required', 400)

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, lineAccountId: user.lineAccountId },
        select: { id: true },
      })
      if (!conversation) return errorResponse('Conversation not found', 404)

      await prisma.conversationAssignee.delete({
        where: {
          conversationId_userId: {
            conversationId,
            userId: assigneeId,
          },
        },
      })

      sendSseEvent(user.lineAccountId, 'assignees-updated', { conversationId })
      sendSseEvent(user.lineAccountId, 'conversation-updated', { conversationId })

      return successResponse({ ok: true })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return successResponse({ ok: true })
      }
      console.error('Error removing assignee:', error)
      return errorResponse('Failed to remove assignee', 500)
    }
  }
)
