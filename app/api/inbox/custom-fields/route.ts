import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

const allowedTypes = ['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'CHECKBOX'] as const

/**
 * GET /api/inbox/custom-fields
 * POST /api/inbox/custom-fields
 * PATCH /api/inbox/custom-fields (reorder)
 *
 * Requirements: 7.1, 7.2, 7.7
 */
export const GET = withPermission('viewCustomers', async (user) => {
  try {
    const fields = await prisma.customField.findMany({
      where: { lineAccountId: user.lineAccountId },
      orderBy: { displayOrder: 'asc' },
    })
    return successResponse({ fields })
  } catch (error) {
    console.error('Error fetching custom fields:', error)
    return errorResponse('Failed to fetch custom fields', 500)
  }
})

export const POST = withPermission('manageCustomFields', async (user, request: NextRequest) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; fieldType?: unknown; isRequired?: unknown; options?: unknown }
      | null

    const name = sanitizeText(body?.name, { maxLen: 80 })
    const fieldType = sanitizeText(body?.fieldType, { maxLen: 20 })
    const isRequired = typeof body?.isRequired === 'boolean' ? body.isRequired : false
    const options = Array.isArray(body?.options)
      ? body!.options
          .filter((o) => typeof o === 'string' && o.trim())
          .map((o) => sanitizeText(o, { maxLen: 80 }))
          .filter(Boolean)
      : []

    if (!name) return errorResponse('name is required', 400)
    if (!allowedTypes.includes(fieldType as any)) return errorResponse('Invalid fieldType', 400)
    if (fieldType !== 'DROPDOWN' && options.length > 0) return errorResponse('options only valid for DROPDOWN', 400)

    const maxOrder = await prisma.customField.aggregate({
      where: { lineAccountId: user.lineAccountId },
      _max: { displayOrder: true },
    })

    const field = await prisma.customField.create({
      data: {
        lineAccountId: user.lineAccountId,
        name,
        fieldType: fieldType as any,
        isRequired,
        options,
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      },
      select: { id: true },
    })

    return successResponse({ field }, 201)
  } catch (error) {
    console.error('Error creating custom field:', error)
    return errorResponse('Failed to create custom field', 500)
  }
})

export const PATCH = withPermission('manageCustomFields', async (user, request: NextRequest) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { orderedIds?: unknown }
      | null

    const orderedIds = Array.isArray(body?.orderedIds)
      ? body!.orderedIds.filter((id) => typeof id === 'string')
      : []

    if (orderedIds.length === 0) return errorResponse('orderedIds is required', 400)

    const existing = await prisma.customField.findMany({
      where: { lineAccountId: user.lineAccountId, id: { in: orderedIds } },
      select: { id: true },
    })

    const allowed = new Set(existing.map((f) => f.id))
    const txs = orderedIds
      .filter((id) => allowed.has(id))
      .map((id, idx) =>
        prisma.customField.update({
          where: { id, lineAccountId: user.lineAccountId },
          data: { displayOrder: idx },
        })
      )

    await prisma.$transaction(txs)
    return successResponse({ ok: true })
  } catch (error) {
    console.error('Error reordering custom fields:', error)
    return errorResponse('Failed to reorder custom fields', 500)
  }
})
