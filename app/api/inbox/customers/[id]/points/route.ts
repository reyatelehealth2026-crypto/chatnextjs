import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'

/**
 * GET /api/inbox/customers/[id]/points
 * POST /api/inbox/customers/[id]/points
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
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

      const transactions = await prisma.pointsTransaction.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          amount: true,
          balance: true,
          type: true,
          description: true,
          createdAt: true,
          admin: { select: { id: true, name: true, email: true } },
        },
      })

      const balance = transactions[0]?.balance ?? 0
      return successResponse({ balance, transactions })
    } catch (error) {
      console.error('Error fetching points:', error)
      return errorResponse('Failed to fetch points', 500)
    }
  }
)

export const POST = withPermission(
  'managePoints',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as
        | { amount?: unknown; description?: unknown; type?: unknown }
        | null

      const amount = typeof body?.amount === 'number' ? Math.trunc(body.amount) : null
      const descriptionRaw = sanitizeText(body?.description, { maxLen: 500 })
      const description = descriptionRaw ? descriptionRaw : null
      const type = sanitizeText(body?.type, { maxLen: 20 }) || null

      if (amount === null || amount === 0) {
        return errorResponse('amount is required', 400)
      }

      const customer = await prisma.customer.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
        select: { id: true },
      })
      if (!customer) return errorResponse('Customer not found', 404)

      const latest = await prisma.pointsTransaction.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        select: { balance: true },
      })
      const currentBalance = latest?.balance ?? 0
      const nextBalance = currentBalance + amount
      if (nextBalance < 0) return errorResponse('Insufficient balance', 400)

      const resolvedType = type ?? (amount > 0 ? 'EARNED' : 'REDEEMED')

      const tx = await prisma.pointsTransaction.create({
        data: {
          customerId: customer.id,
          amount,
          balance: nextBalance,
          type: resolvedType as any,
          description: description || undefined,
          createdBy: user.id,
        },
        select: { id: true },
      })

      sendSseEvent(user.lineAccountId, 'customer-updated', { customerId: customer.id })

      return successResponse({ transaction: tx }, 201)
    } catch (error) {
      console.error('Error creating points transaction:', error)
      return errorResponse('Failed to update points', 500)
    }
  }
)
