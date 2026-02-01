import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'

/**
 * PATCH /api/inbox/conversations/[id]/satisfaction
 *
 * Requirements: 16.1, 16.2
 */
export const PATCH = withPermission(
  'updateConversationStatus',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as
        | { rating?: unknown }
        | null

      const rating = typeof body?.rating === 'number' ? Math.trunc(body.rating) : null
      if (rating === null || rating < 1 || rating > 5) {
        return errorResponse('rating must be 1-5', 400)
      }

      const conversation = await prisma.conversation.update({
        where: { id, lineAccountId: user.lineAccountId },
        data: {
          satisfactionRating: rating,
          satisfactionRatedAt: new Date(),
        },
        select: { id: true },
      })

      sendSseEvent(user.lineAccountId, 'conversation-updated', { conversationId: conversation.id })
      return successResponse({ ok: true })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return errorResponse('Conversation not found', 404)
      }
      console.error('Error updating satisfaction:', error)
      return errorResponse('Failed to update satisfaction', 500)
    }
  }
)
