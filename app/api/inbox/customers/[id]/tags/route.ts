import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

/**
 * POST /api/inbox/customers/[id]/tags
 * DELETE /api/inbox/customers/[id]/tags?tagId=...
 *
 * Requirements: 6.3, 6.4, 6.5
 */
export const POST = withPermission(
  'manageCustomerTags',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as
        | { name?: unknown; color?: unknown }
        | null

      const name = sanitizeText(body?.name, { maxLen: 60 })
      const color = sanitizeText(body?.color, { maxLen: 20 }) || undefined
      if (!name) return errorResponse('Tag name is required', 400)

      const customer = await prisma.customer.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        select: { id: true },
      })
      if (!customer) return errorResponse('Customer not found', 404)

      const tag = await prisma.customerTag.create({
        data: {
          customerId: customer.id,
          name,
          ...(color ? { color } : null),
        } as any,
      })

      sendSseEvent(user.lineAccountId, 'customer-updated', { customerId: customer.id })

      return successResponse({ tag }, 201)
    } catch (error) {
      console.error('Error creating tag:', error)
      return errorResponse('Failed to create tag', 500)
    }
  }
)

export const DELETE = withPermission(
  'manageCustomerTags',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const { searchParams } = new URL(request.url)
      const tagId = searchParams.get('tagId')
      if (!tagId) return errorResponse('tagId is required', 400)

      const customer = await prisma.customer.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        select: { id: true },
      })
      if (!customer) return errorResponse('Customer not found', 404)

      await prisma.customerTag.deleteMany({
        where: { id: tagId, customer: { id: customer.id, lineAccountId: user.lineAccountId } },
      })

      sendSseEvent(user.lineAccountId, 'customer-updated', { customerId: customer.id })

      return successResponse({ ok: true })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return successResponse({ ok: true })
      }
      console.error('Error deleting tag:', error)
      return errorResponse('Failed to delete tag', 500)
    }
  }
)
