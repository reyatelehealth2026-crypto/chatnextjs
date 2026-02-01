import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'

/**
 * GET /api/inbox/analytics/conversations?days=30
 *
 * Requirements: 14.2, 14.3
 */
export const GET = withPermission('viewAnalytics', async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30')))

    const from = new Date()
    from.setDate(from.getDate() - days)

    const conversations = await prisma.conversation.findMany({
      where: { lineAccountId: user.lineAccountId, createdAt: { gte: from } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const buckets = new Map<string, number>()
    for (const c of conversations) {
      const key = c.createdAt.toISOString().slice(0, 10)
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }

    const series = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
    return successResponse({ days, series })
  } catch (error) {
    console.error('Error fetching conversation analytics:', error)
    return errorResponse('Failed to fetch analytics', 500)
  }
})

