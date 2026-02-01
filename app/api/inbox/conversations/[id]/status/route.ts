import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

const allowedStatuses = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] as const

/**
 * PATCH /api/inbox/conversations/[id]/status
 *
 * Requirements: 5.3, 5.6
 */
export const PATCH = withPermission(
  'updateConversationStatus',
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: conversationId } = await params
      const body = (await request.json().catch(() => null)) as
        | { status?: unknown }
        | null

      const nextStatus = typeof body?.status === 'string' ? sanitizeText(body.status, { maxLen: 20 }) : null
      if (!nextStatus || !allowedStatuses.includes(nextStatus as any)) {
        return errorResponse('Invalid status', 400)
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, lineAccountId: user.lineAccountId },
        select: { id: true, status: true },
      })
      if (!conversation) return errorResponse('Conversation not found', 404)

      const now = new Date()

      await prisma.$transaction(async (tx) => {
        await tx.conversation.update({
          where: { id: conversationId, lineAccountId: user.lineAccountId },
          data: {
            status: nextStatus as any,
            resolvedAt:
              nextStatus === 'RESOLVED' ? now : conversation.status === 'RESOLVED' ? null : undefined,
            closedAt:
              nextStatus === 'CLOSED' ? now : conversation.status === 'CLOSED' ? null : undefined,
          },
        })

        await tx.conversationStatusHistory.create({
          data: {
            conversationId,
            fromStatus: conversation.status as any,
            toStatus: nextStatus as any,
            changedBy: user.id,
          },
        })
      })

      sendSseEvent(user.lineAccountId, 'status-updated', { conversationId })
      sendSseEvent(user.lineAccountId, 'conversation-updated', { conversationId })

      return successResponse({ ok: true })
    } catch (error) {
      console.error('Error updating status:', error)
      return errorResponse('Failed to update status', 500)
    }
  }
)
