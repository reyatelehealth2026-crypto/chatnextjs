import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendLineTextMessage } from '@/lib/line'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

/**
 * POST /api/inbox/conversations/[id]/messages
 * Send a message (outbound) and persist it to DB.
 *
 * Requirements: 3.1, 3.3
 */
export const POST = withPermission(
  'viewConversations',
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: conversationId } = await params
      const body = (await request.json().catch(() => null)) as
        | {
            content?: unknown
            attachments?: unknown
          }
        | null

      const content = sanitizeText(body?.content, { maxLen: 5000 })
      const attachmentsInput = Array.isArray(body?.attachments) ? body?.attachments : []

      if (!content && attachmentsInput.length === 0) {
        return errorResponse('Message content is required', 400)
      }

      // Ensure tenant isolation and fetch LINE identifiers for sending.
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
          lineAccountId: user.lineAccountId,
        },
        include: {
          customer: { select: { lineUserId: true } },
          lineAccount: { select: { lineAccessToken: true } },
        },
      })

      if (!conversation) {
        return errorResponse('Conversation not found', 404)
      }

      const now = new Date()

      const message = await prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            conversationId,
            content: content || '',
            direction: 'OUTBOUND',
            senderId: user.id,
            messageType: 'TEXT',
          },
          select: {
            id: true,
            content: true,
            direction: true,
            messageType: true,
            createdAt: true,
          },
        })

        await tx.conversation.update({
          where: {
            id: conversationId,
            lineAccountId: user.lineAccountId,
          },
          data: {
            lastMessageAt: now,
            firstResponseAt: conversation.firstResponseAt ?? now,
          },
        })

        return created
      })

      // Persist attachments (best-effort validation).
      if (attachmentsInput.length > 0) {
        const attachments = attachmentsInput
          .map((a) => {
            if (!a || typeof a !== 'object') return null
            const obj = a as any
            if (typeof obj.storageKey !== 'string') return null
            if (typeof obj.fileName !== 'string') return null
            if (typeof obj.fileSize !== 'number') return null
            if (typeof obj.mimeType !== 'string') return null
            return {
              messageId: message.id,
              storageKey: sanitizeText(obj.storageKey, { maxLen: 500 }),
              fileName: sanitizeText(obj.fileName, { maxLen: 200 }),
              fileSize: Math.max(0, Math.floor(obj.fileSize)),
              mimeType: sanitizeText(obj.mimeType, { maxLen: 120 }),
              url: typeof obj.url === 'string' ? sanitizeText(obj.url, { maxLen: 2000 }) : null,
              thumbnailUrl: typeof obj.thumbnailUrl === 'string' ? sanitizeText(obj.thumbnailUrl, { maxLen: 2000 }) : null,
            }
          })
          .filter(Boolean) as Array<{
          messageId: string
          storageKey: string
          fileName: string
          fileSize: number
          mimeType: string
          url: string | null
          thumbnailUrl: string | null
        }>

        if (attachments.length > 0) {
          await prisma.fileAttachment.createMany({
            data: attachments.map((a) => ({
              messageId: a.messageId,
              storageKey: a.storageKey,
              fileName: a.fileName,
              fileSize: a.fileSize,
              mimeType: a.mimeType,
              url: a.url ?? undefined,
              thumbnailUrl: a.thumbnailUrl ?? undefined,
            })),
          })
        }
      }

      // Best-effort send to LINE; if it fails, keep the DB record but surface an error.
      try {
        await sendLineTextMessage({
          channelAccessToken: conversation.lineAccount.lineAccessToken,
          to: conversation.customer.lineUserId,
          text: content || '',
        })
      } catch (err) {
        console.error('LINE send failed:', err)
        return errorResponse('Failed to send message to LINE', 502)
      }

      sendSseEvent(user.lineAccountId, 'new-message', {
        conversationId,
        messageId: message.id,
      })
      sendSseEvent(user.lineAccountId, 'conversation-updated', { conversationId })

      return successResponse({ message }, 201)
    } catch (error) {
      console.error('Error sending message:', error)
      return errorResponse('Failed to send message', 500)
    }
  }
)
