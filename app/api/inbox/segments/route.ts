import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { recalcSegmentMembers, type SegmentCriteria } from '@/lib/segments'
import { sanitizeText } from '@/lib/sanitize'

/**
 * GET /api/inbox/segments
 * POST /api/inbox/segments
 *
 * Requirements: 13.1, 13.3
 */
export const GET = withPermission('viewSegments', async (user) => {
  try {
    const segments = await prisma.segment.findMany({
      where: { lineAccountId: user.lineAccountId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        memberCount: true,
        updatedAt: true,
      },
    })
    return successResponse({ segments })
  } catch (error) {
    console.error('Error fetching segments:', error)
    return errorResponse('Failed to fetch segments', 500)
  }
})

export const POST = withPermission('manageSegments', async (user, request: NextRequest) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; description?: unknown; criteria?: unknown }
      | null

    const name = sanitizeText(body?.name, { maxLen: 120 })
    const descriptionRaw = sanitizeText(body?.description, { maxLen: 500 })
    const description = descriptionRaw ? descriptionRaw : null
    const criteria =
      body?.criteria && typeof body.criteria === 'object'
        ? (body.criteria as SegmentCriteria)
        : {}

    if (!name) return errorResponse('name is required', 400)

    const segment = await prisma.segment.create({
      data: {
        lineAccountId: user.lineAccountId,
        name,
        description: description || undefined,
        criteria: criteria as any,
      },
      select: { id: true },
    })

    await recalcSegmentMembers({
      lineAccountId: user.lineAccountId,
      segmentId: segment.id,
      criteria,
    })

    return successResponse({ segment }, 201)
  } catch (error) {
    console.error('Error creating segment:', error)
    return errorResponse('Failed to create segment', 500)
  }
})
