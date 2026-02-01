import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'

function parseDate(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * GET /api/inbox/analytics/overview?dateFrom=&dateTo=
 *
 * Requirements: 14.1, 14.2, 14.7
 */
export const GET = withPermission('viewAnalytics', async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = parseDate(searchParams.get('dateFrom'))
    const dateTo = parseDate(searchParams.get('dateTo'))

    const convoWhere: any = { lineAccountId: user.lineAccountId }
    if (dateFrom || dateTo) {
      convoWhere.createdAt = {}
      if (dateFrom) convoWhere.createdAt.gte = dateFrom
      if (dateTo) convoWhere.createdAt.lte = dateTo
    }

    const [customers, conversationsTotal, byStatus, messagesTotal] = await Promise.all([
      prisma.customer.count({ where: { lineAccountId: user.lineAccountId } }),
      prisma.conversation.count({ where: convoWhere }),
      prisma.conversation.groupBy({
        by: ['status'],
        where: convoWhere,
        _count: { _all: true },
      }),
      prisma.message.count({
        where: {
          conversation: { lineAccountId: user.lineAccountId },
          ...(dateFrom || dateTo
            ? {
                createdAt: {
                  ...(dateFrom ? { gte: dateFrom } : null),
                  ...(dateTo ? { lte: dateTo } : null),
                },
              }
            : null),
        },
      }),
    ])

    const statusCounts: Record<string, number> = {}
    for (const row of byStatus) {
      statusCounts[row.status] = row._count._all
    }

    return successResponse({
      customers,
      conversations: {
        total: conversationsTotal,
        byStatus: statusCounts,
      },
      messages: {
        total: messagesTotal,
      },
    })
  } catch (error) {
    console.error('Error fetching overview analytics:', error)
    return errorResponse('Failed to fetch analytics', 500)
  }
})

