import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'

/**
 * GET /api/inbox/users
 * List users in the current tenant (for assignee selection).
 */
export const GET = withPermission('viewConversations', async (user) => {
  try {
    const users = await prisma.user.findMany({
      where: { lineAccountId: user.lineAccountId },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    })

    return successResponse({ users })
  } catch (error) {
    console.error('Error listing users:', error)
    return errorResponse('Failed to list users', 500)
  }
})

