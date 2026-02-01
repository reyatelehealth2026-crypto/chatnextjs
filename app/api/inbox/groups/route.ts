import { withPermission, successResponse, errorResponse } from '@/lib/api-helpers'
import prisma from '@/lib/prisma'

/**
 * GET /api/inbox/groups
 * Lists LINE groups for the tenant with member counts and last message time.
 * Requirements: 17.1, 17.5
 */
export const GET = withPermission('viewConversations', async (user) => {
  try {
    const groups = await prisma.group.findMany({
      where: { lineAccountId: user.lineAccountId },
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true,
        name: true,
        lineGroupId: true,
        pictureUrl: true,
        memberCount: true,
        lastMessageAt: true,
      },
    })

    return successResponse({ groups })
  } catch (error) {
    console.error('Error listing groups:', error)
    return errorResponse('Failed to list groups', 500)
  }
})

