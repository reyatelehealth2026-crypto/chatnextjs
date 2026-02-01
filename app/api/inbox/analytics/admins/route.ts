import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'

/**
 * GET /api/inbox/analytics/admins
 *
 * Requirements: 14.4
 */
export const GET = withPermission('viewAnalytics', async (user) => {
  try {
    const users = await prisma.user.findMany({
      where: { lineAccountId: user.lineAccountId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { email: 'asc' },
    })

    const outboundCounts = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        direction: 'OUTBOUND',
        conversation: { lineAccountId: user.lineAccountId },
        senderId: { not: null },
      },
      _count: { _all: true },
    })

    const assignedCounts = await prisma.conversationAssignee.groupBy({
      by: ['userId'],
      where: { conversation: { lineAccountId: user.lineAccountId } },
      _count: { _all: true },
    })

    const outboundMap = new Map(outboundCounts.map((r) => [r.senderId as string, r._count._all]))
    const assignedMap = new Map(assignedCounts.map((r) => [r.userId, r._count._all]))

    return successResponse({
      admins: users.map((u) => ({
        ...u,
        outboundMessages: outboundMap.get(u.id) ?? 0,
        assignedConversations: assignedMap.get(u.id) ?? 0,
      })),
    })
  } catch (error) {
    console.error('Error fetching admin analytics:', error)
    return errorResponse('Failed to fetch analytics', 500)
  }
})

