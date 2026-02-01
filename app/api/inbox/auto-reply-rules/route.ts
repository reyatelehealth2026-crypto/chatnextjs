import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

/**
 * GET /api/inbox/auto-reply-rules
 * POST /api/inbox/auto-reply-rules
 *
 * Requirements: 10.1, 10.6, 10.7
 */
export const GET = withPermission('viewAutoReplyRules', async (user) => {
  try {
    const rules = await prisma.autoReplyRule.findMany({
      where: { lineAccountId: user.lineAccountId },
      orderBy: [{ isEnabled: 'desc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        triggerType: true,
        triggerValue: true,
        responseContent: true,
        isEnabled: true,
        priority: true,
        usageCount: true,
        updatedAt: true,
      },
    })
    return successResponse({ rules })
  } catch (error) {
    console.error('Error fetching rules:', error)
    return errorResponse('Failed to fetch rules', 500)
  }
})

export const POST = withPermission('manageAutoReplyRules', async (user, request: NextRequest) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          name?: unknown
          triggerType?: unknown
          triggerValue?: unknown
          responseContent?: unknown
          priority?: unknown
          isEnabled?: unknown
        }
      | null

    const name = sanitizeText(body?.name, { maxLen: 120 })
    const triggerType = sanitizeText(body?.triggerType, { maxLen: 40 })
    const triggerValue = sanitizeText(body?.triggerValue, { maxLen: 200 })
    const responseContent = sanitizeText(body?.responseContent, { maxLen: 5000 })
    const priority = typeof body?.priority === 'number' ? Math.floor(body.priority) : 0
    const isEnabled = typeof body?.isEnabled === 'boolean' ? body.isEnabled : true

    if (!name || !triggerType || !triggerValue || !responseContent) {
      return errorResponse('name, triggerType, triggerValue, responseContent are required', 400)
    }

    const rule = await prisma.autoReplyRule.create({
      data: {
        lineAccountId: user.lineAccountId,
        name,
        triggerType: triggerType as any,
        triggerValue,
        responseContent,
        priority,
        isEnabled,
        createdBy: user.id,
      },
      select: { id: true },
    })

    return successResponse({ rule }, 201)
  } catch (error) {
    console.error('Error creating rule:', error)
    return errorResponse('Failed to create rule', 500)
  }
})
