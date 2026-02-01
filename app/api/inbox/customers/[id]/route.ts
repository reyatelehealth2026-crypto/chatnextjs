import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

/**
 * GET /api/inbox/customers/[id]
 * PATCH /api/inbox/customers/[id]
 *
 * Requirements: 6.1, 6.2, 6.8
 */
export const GET = withPermission(
  'viewCustomers',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const customer = await prisma.customer.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        include: {
          tags: { orderBy: { createdAt: 'desc' } },
          notes: {
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { id: true, name: true, email: true } } },
          },
          conversations: {
            select: { id: true, status: true, lastMessageAt: true },
            orderBy: { lastMessageAt: 'desc' },
          },
        },
      })

      if (!customer) return errorResponse('Customer not found', 404)

      return successResponse({ customer })
    } catch (error) {
      console.error('Error fetching customer:', error)
      return errorResponse('Failed to fetch customer', 500)
    }
  }
)

export const PATCH = withPermission(
  'editCustomers',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as
        | { displayName?: unknown; statusMessage?: unknown; isBlocked?: unknown }
        | null

      const data: any = {}
      if (body?.displayName != null) data.displayName = sanitizeText(body.displayName, { maxLen: 120 })
      if (body?.statusMessage != null) data.statusMessage = sanitizeText(body.statusMessage, { maxLen: 500 })
      if (typeof body?.isBlocked === 'boolean') data.isBlocked = body.isBlocked

      const customer = await prisma.customer.update({
        where: { id, lineAccountId: user.lineAccountId },
        data,
        select: { id: true },
      })

      sendSseEvent(user.lineAccountId, 'customer-updated', { customerId: customer.id })

      return successResponse({ ok: true })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return errorResponse('Customer not found', 404)
      }
      console.error('Error updating customer:', error)
      return errorResponse('Failed to update customer', 500)
    }
  }
)
