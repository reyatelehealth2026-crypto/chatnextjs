import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

function validateValue(params: {
  fieldType: string
  value: string
  options: string[]
}) {
  const v = params.value
  switch (params.fieldType) {
    case 'TEXT':
      return true
    case 'NUMBER':
      return v.trim() === '' ? true : !Number.isNaN(Number(v))
    case 'DATE':
      return v.trim() === '' ? true : !Number.isNaN(new Date(v).getTime())
    case 'CHECKBOX':
      return ['true', 'false', '0', '1', ''].includes(v.toLowerCase())
    case 'DROPDOWN':
      return v.trim() === '' ? true : params.options.includes(v)
    default:
      return false
  }
}

/**
 * GET /api/inbox/customers/[id]/custom-fields
 * PATCH /api/inbox/customers/[id]/custom-fields
 *
 * Requirements: 7.3, 7.4, 7.5
 */
export const GET = withPermission(
  'viewCustomers',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const customer = await prisma.customer.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        select: { id: true },
      })
      if (!customer) return errorResponse('Customer not found', 404)

      const fields = await prisma.customField.findMany({
        where: { lineAccountId: user.lineAccountId },
        orderBy: { displayOrder: 'asc' },
      })

      const values = await prisma.customFieldValue.findMany({
        where: { customerId: customer.id, customFieldId: { in: fields.map((f) => f.id) } },
      })
      const valueMap = new Map(values.map((v) => [v.customFieldId, v.value]))

      return successResponse({
        fields: fields.map((f) => ({
          ...f,
          value: valueMap.get(f.id) ?? '',
        })),
      })
    } catch (error) {
      console.error('Error fetching customer custom fields:', error)
      return errorResponse('Failed to fetch custom fields', 500)
    }
  }
)

export const PATCH = withPermission(
  'editCustomers',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as
        | { values?: unknown }
        | null

      const values = body?.values && typeof body.values === 'object' ? (body.values as Record<string, unknown>) : null
      if (!values) return errorResponse('values is required', 400)

      const customer = await prisma.customer.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        select: { id: true },
      })
      if (!customer) return errorResponse('Customer not found', 404)

      const fields = await prisma.customField.findMany({
        where: { lineAccountId: user.lineAccountId, id: { in: Object.keys(values) } },
        select: { id: true, fieldType: true, options: true, isRequired: true },
      })

      const updates = fields.map((f) => {
        const raw = values[f.id]
        const value =
          raw === null || raw === undefined ? '' : sanitizeText(String(raw), { maxLen: 500 })

        if (f.isRequired && value.trim() === '') {
          throw new Error(`Field ${f.id} is required`)
        }
        if (!validateValue({ fieldType: f.fieldType as any, value, options: f.options })) {
          throw new Error(`Invalid value for field ${f.id}`)
        }

        return prisma.customFieldValue.upsert({
          where: {
            customFieldId_customerId: {
              customFieldId: f.id,
              customerId: customer.id,
            },
          },
          create: {
            customFieldId: f.id,
            customerId: customer.id,
            value,
          },
          update: { value },
        })
      })

      await prisma.$transaction(updates)
      sendSseEvent(user.lineAccountId, 'customer-updated', { customerId: customer.id })
      return successResponse({ ok: true })
    } catch (error: any) {
      if (error instanceof Error && error.message.startsWith('Field')) {
        return errorResponse(error.message, 400)
      }
      console.error('Error updating customer custom fields:', error)
      return errorResponse('Failed to update custom fields', 500)
    }
  }
)
