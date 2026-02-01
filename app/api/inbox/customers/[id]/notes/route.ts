import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

/**
 * POST /api/inbox/customers/[id]/notes
 * DELETE /api/inbox/customers/[id]/notes?noteId=...
 *
 * Requirements: 6.6, 6.7
 */
export const POST = withPermission(
  'manageCustomerNotes',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as
        | { content?: unknown }
        | null

      const content = sanitizeText(body?.content, { maxLen: 5000 })
      if (!content) return errorResponse('Note content is required', 400)

      const customer = await prisma.customer.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        select: { id: true },
      })
      if (!customer) return errorResponse('Customer not found', 404)

      const note = await prisma.customerNote.create({
        data: {
          customerId: customer.id,
          content,
          createdBy: user.id,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      })

      sendSseEvent(user.lineAccountId, 'customer-updated', { customerId: customer.id })

      return successResponse({ note }, 201)
    } catch (error) {
      console.error('Error creating note:', error)
      return errorResponse('Failed to create note', 500)
    }
  }
)

export const DELETE = withPermission(
  'manageCustomerNotes',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const { searchParams } = new URL(request.url)
      const noteId = searchParams.get('noteId')
      if (!noteId) return errorResponse('noteId is required', 400)

      const customer = await prisma.customer.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        select: { id: true },
      })
      if (!customer) return errorResponse('Customer not found', 404)

      // Notes are private; only enforce tenant isolation via customer lookup above.
      await prisma.customerNote.deleteMany({
        where: { id: noteId, customer: { id: customer.id, lineAccountId: user.lineAccountId } },
      })

      sendSseEvent(user.lineAccountId, 'customer-updated', { customerId: customer.id })

      return successResponse({ ok: true })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return successResponse({ ok: true })
      }
      console.error('Error deleting note:', error)
      return errorResponse('Failed to delete note', 500)
    }
  }
)
