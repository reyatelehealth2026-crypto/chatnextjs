import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

/**
 * POST /api/inbox/auto-reply-rules/[id]/toggle
 * Body: { isEnabled: boolean }
 */
export const POST = withPermission(
  'manageAutoReplyRules',
  async (user, request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as
        | { isEnabled?: unknown }
        | null
      const isEnabled =
        typeof body?.isEnabled === 'boolean'
          ? body.isEnabled
          : typeof body?.isEnabled === 'string'
            ? sanitizeText(body.isEnabled, { maxLen: 8 }).toLowerCase() === 'true'
            : null
      if (isEnabled === null) return errorResponse('isEnabled is required', 400)

      const rule = await prisma.autoReplyRule.update({
        where: { id, lineAccountId: user.lineAccountId },
        data: { isEnabled },
        select: { id: true },
      })

      return successResponse({ rule })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return errorResponse('Rule not found', 404)
      }
      console.error('Error toggling rule:', error)
      return errorResponse('Failed to toggle rule', 500)
    }
  }
)
