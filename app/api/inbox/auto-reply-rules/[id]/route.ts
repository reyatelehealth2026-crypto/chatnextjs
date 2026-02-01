import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

export const GET = withPermission(
  'viewAutoReplyRules',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const rule = await prisma.autoReplyRule.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
      })
      if (!rule) return errorResponse('Rule not found', 404)
      return successResponse({ rule })
    } catch (error) {
      console.error('Error fetching rule:', error)
      return errorResponse('Failed to fetch rule', 500)
    }
  }
)

export const PATCH = withPermission(
  'manageAutoReplyRules',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as any
      const data: any = {}
      if (body?.name != null) data.name = sanitizeText(body.name, { maxLen: 120 })
      if (typeof body?.triggerType === 'string') data.triggerType = body.triggerType
      if (body?.triggerValue != null) data.triggerValue = sanitizeText(body.triggerValue, { maxLen: 200 })
      if (body?.responseContent != null) data.responseContent = sanitizeText(body.responseContent, { maxLen: 5000 })
      if (typeof body?.priority === 'number') data.priority = Math.floor(body.priority)
      if (typeof body?.isEnabled === 'boolean') data.isEnabled = body.isEnabled

      const rule = await prisma.autoReplyRule.update({
        where: { id, lineAccountId: user.lineAccountId },
        data,
        select: { id: true },
      })

      return successResponse({ rule })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return errorResponse('Rule not found', 404)
      }
      console.error('Error updating rule:', error)
      return errorResponse('Failed to update rule', 500)
    }
  }
)

export const DELETE = withPermission(
  'manageAutoReplyRules',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      await prisma.autoReplyRule.delete({
        where: { id, lineAccountId: user.lineAccountId },
      })
      return successResponse({ ok: true })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return successResponse({ ok: true })
      }
      console.error('Error deleting rule:', error)
      return errorResponse('Failed to delete rule', 500)
    }
  }
)
