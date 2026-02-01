import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendLineTextMessage } from '@/lib/line'
import { sanitizeText } from '@/lib/sanitize'

/**
 * POST /api/inbox/groups/[id]/messages
 * Send an outbound message to a group and persist locally.
 */
export const POST = withPermission(
  'viewConversations',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as { content?: unknown } | null
      const content = sanitizeText(body?.content, { maxLen: 4000 })
      if (!content) return errorResponse('content is required', 400)

      const group = await prisma.group.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        select: { id: true, lineGroupId: true, lineAccount: { select: { lineAccessToken: true } } },
      })
      if (!group) return errorResponse('Group not found', 404)

      // Record message in DB
      const message = await prisma.groupMessage.create({
        data: {
          groupId: group.id,
          lineUserId: user.id,
          content,
          messageType: 'TEXT',
        },
        select: { id: true, content: true, createdAt: true },
      })

      // Best-effort send to LINE group (push)
      try {
        await sendLineTextMessage({
          channelAccessToken: group.lineAccount.lineAccessToken,
          to: group.lineGroupId,
          text: content,
        })
      } catch (err) {
        console.error('LINE group send failed:', err)
      }

      return successResponse({ message }, 201)
    } catch (error) {
      console.error('Error sending group message:', error)
      return errorResponse('Failed to send message', 500)
    }
  }
)
