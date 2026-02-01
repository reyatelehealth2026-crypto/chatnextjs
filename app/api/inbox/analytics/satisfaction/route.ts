import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'

/**
 * GET /api/inbox/analytics/satisfaction
 *
 * Requirements: 16.3, 16.4
 */
export const GET = withPermission('viewAnalytics', async (user) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { lineAccountId: user.lineAccountId, satisfactionRating: { not: null } },
      select: { satisfactionRating: true },
      take: 1000,
    })

    const ratings = conversations
      .map((c) => c.satisfactionRating)
      .filter((r): r is number => typeof r === 'number')

    const distribution: Record<string, number> = {}
    for (const r of ratings) {
      distribution[String(r)] = (distribution[String(r)] ?? 0) + 1
    }

    const average =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

    return successResponse({ average, count: ratings.length, distribution })
  } catch (error) {
    console.error('Error fetching satisfaction analytics:', error)
    return errorResponse('Failed to fetch satisfaction analytics', 500)
  }
})

