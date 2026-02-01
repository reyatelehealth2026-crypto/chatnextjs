import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'

/**
 * GET /api/inbox/groups/[id]
 * Returns group detail with members and recent messages.
 */
export const GET = withPermission(
  'viewConversations',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const group = await prisma.group.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        include: {
          members: {
            orderBy: { joinedAt: 'desc' },
            select: { id: true, lineUserId: true, displayName: true, pictureUrl: true, joinedAt: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { id: true, content: true, messageType: true, createdAt: true, lineUserId: true },
          },
        },
      })
      if (!group) return errorResponse('Group not found', 404)
      return successResponse({ group })
    } catch (error) {
      console.error('Error fetching group:', error)
      return errorResponse('Failed to fetch group', 500)
    }
  }
)
