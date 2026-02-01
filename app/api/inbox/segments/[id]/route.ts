import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { recalcSegmentMembers, type SegmentCriteria } from '@/lib/segments'
import { sanitizeText } from '@/lib/sanitize'

export const GET = withPermission(
  'viewSegments',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const segment = await prisma.segment.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        include: {
          members: {
            take: 50,
            orderBy: { addedAt: 'desc' },
            include: {
              customer: { select: { id: true, displayName: true, lineUserId: true } },
            },
          },
        },
      })
      if (!segment) return errorResponse('Segment not found', 404)
      return successResponse({ segment })
    } catch (error) {
      console.error('Error fetching segment:', error)
      return errorResponse('Failed to fetch segment', 500)
    }
  }
)

export const PATCH = withPermission(
  'manageSegments',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as
        | { name?: unknown; description?: unknown; criteria?: unknown }
        | null

      const data: any = {}
      if (body?.name != null) data.name = sanitizeText(body.name, { maxLen: 120 })
      if (body?.description != null) data.description = sanitizeText(body.description, { maxLen: 500 })
      if (body?.description === null) data.description = null

      const criteria =
        body?.criteria && typeof body.criteria === 'object'
          ? (body.criteria as SegmentCriteria)
          : null

      const segment = await prisma.segment.update({
        where: { id, lineAccountId: user.lineAccountId },
        data: {
          ...data,
          ...(criteria ? { criteria: criteria as any } : null),
        },
        select: { id: true },
      })

      if (criteria) {
        await recalcSegmentMembers({
          lineAccountId: user.lineAccountId,
          segmentId: segment.id,
          criteria,
        })
      }

      return successResponse({ segment })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return errorResponse('Segment not found', 404)
      }
      console.error('Error updating segment:', error)
      return errorResponse('Failed to update segment', 500)
    }
  }
)

export const DELETE = withPermission(
  'manageSegments',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      await prisma.segment.delete({
        where: { id, lineAccountId: user.lineAccountId },
      })
      return successResponse({ ok: true })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return successResponse({ ok: true })
      }
      console.error('Error deleting segment:', error)
      return errorResponse('Failed to delete segment', 500)
    }
  }
)
