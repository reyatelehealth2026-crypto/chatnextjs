import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'

/**
 * GET /api/inbox/analytics/sla
 *
 * Requirements: 15.1, 15.2, 15.4
 */
export const GET = withPermission('viewSLA', async (user) => {
  try {
    const account = await prisma.lineAccount.findUnique({
      where: { id: user.lineAccountId },
      select: { slaFirstResponse: true, slaResolution: true },
    })

    const thresholds = {
      firstResponseSeconds: account?.slaFirstResponse ?? 300,
      resolutionSeconds: account?.slaResolution ?? 3600,
    }

    const conversations = await prisma.conversation.findMany({
      where: { lineAccountId: user.lineAccountId },
      select: {
        createdAt: true,
        firstResponseAt: true,
        resolvedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const firstResponseTimes: number[] = []
    const resolutionTimes: number[] = []

    let firstResponseMet = 0
    let firstResponseTotal = 0
    let resolutionMet = 0
    let resolutionTotal = 0

    for (const c of conversations) {
      if (c.firstResponseAt) {
        const sec = (c.firstResponseAt.getTime() - c.createdAt.getTime()) / 1000
        firstResponseTimes.push(sec)
        firstResponseTotal++
        if (sec <= thresholds.firstResponseSeconds) firstResponseMet++
      }
      if (c.resolvedAt) {
        const sec = (c.resolvedAt.getTime() - c.createdAt.getTime()) / 1000
        resolutionTimes.push(sec)
        resolutionTotal++
        if (sec <= thresholds.resolutionSeconds) resolutionMet++
      }
    }

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

    return successResponse({
      thresholds,
      sampleSize: conversations.length,
      firstResponse: {
        averageSeconds: avg(firstResponseTimes),
        compliance: firstResponseTotal ? firstResponseMet / firstResponseTotal : null,
      },
      resolution: {
        averageSeconds: avg(resolutionTimes),
        compliance: resolutionTotal ? resolutionMet / resolutionTotal : null,
      },
    })
  } catch (error) {
    console.error('Error fetching SLA analytics:', error)
    return errorResponse('Failed to fetch SLA analytics', 500)
  }
})

