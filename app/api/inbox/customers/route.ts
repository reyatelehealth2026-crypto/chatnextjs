import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

/**
 * GET /api/inbox/customers
 * Basic customer listing for the Customers page.
 */
export const GET = withPermission('viewCustomers', async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit
    const search = sanitizeText(searchParams.get('search'), { maxLen: 200 })

    const where: any = { lineAccountId: user.lineAccountId }
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { lineUserId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastContactAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          pictureUrl: true,
          lineUserId: true,
          statusMessage: true,
          lastContactAt: true,
          isBlocked: true,
          _count: { select: { conversations: true } },
        },
      }),
      prisma.customer.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return successResponse({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return errorResponse('Failed to fetch customers', 500)
  }
})
