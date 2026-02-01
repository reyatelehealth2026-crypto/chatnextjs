import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

const allowedStatuses = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] as const

/**
 * PATCH /api/inbox/conversations/bulk-status
 *
 * Requirements: 5.4
 */
export const PATCH = withPermission(
  'updateConversationStatus',
  async (user, request: NextRequest) => {
    try {
      const body = (await request.json().catch(() => null)) as
        | { conversationIds?: unknown; status?: unknown }
        | null

      const status = typeof body?.status === 'string' ? sanitizeText(body.status, { maxLen: 20 }) : null
      const conversationIds = Array.isArray(body?.conversationIds)
        ? body?.conversationIds
            .filter((id) => typeof id === 'string' && id.trim())
            .map((id: string) => sanitizeText(id, { maxLen: 64 }))
            .filter(Boolean)
        : []
      const uniqueIds = Array.from(new Set(conversationIds))

      if (!status || !allowedStatuses.includes(status as any)) {
        return errorResponse('Invalid status', 400)
      }
      if (uniqueIds.length === 0) {
        return errorResponse('conversationIds is required', 400)
      }

      const now = new Date()

      // Fetch current statuses for audit trail.
      const existing = await prisma.conversation.findMany({
        where: {
          id: { in: uniqueIds },
          lineAccountId: user.lineAccountId,
        },
        select: { id: true, status: true },
      })

      await prisma.$transaction(async (tx) => {
        await tx.conversation.updateMany({
          where: {
            id: { in: existing.map((c) => c.id) },
            lineAccountId: user.lineAccountId,
          },
          data: {
            status: status as any,
            resolvedAt: status === 'RESOLVED' ? now : undefined,
            closedAt: status === 'CLOSED' ? now : undefined,
          },
        })

        await tx.conversationStatusHistory.createMany({
          data: existing.map((c) => ({
            conversationId: c.id,
            fromStatus: c.status as any,
            toStatus: status as any,
            changedBy: user.id,
            changedAt: now,
          })),
        })
      })

      for (const c of existing) {
        sendSseEvent(user.lineAccountId, 'status-updated', { conversationId: c.id })
        sendSseEvent(user.lineAccountId, 'conversation-updated', { conversationId: c.id })
      }

      return successResponse({ updated: existing.length })
    } catch (error) {
      console.error('Error bulk updating status:', error)
      return errorResponse('Failed to bulk update status', 500)
    }
  }
)
