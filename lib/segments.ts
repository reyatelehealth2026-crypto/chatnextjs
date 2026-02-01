import prisma from '@/lib/prisma'

export type SegmentCriteria = {
  tagNames?: string[]
  isBlocked?: boolean
  pointsMin?: number
  pointsMax?: number
}

export async function recalcSegmentMembers(params: {
  lineAccountId: string
  segmentId: string
  criteria: SegmentCriteria
}) {
  const tagNames = Array.isArray(params.criteria.tagNames)
    ? params.criteria.tagNames.filter((t) => typeof t === 'string' && t.trim())
    : []
  const isBlocked = typeof params.criteria.isBlocked === 'boolean' ? params.criteria.isBlocked : undefined
  const pointsMin = typeof params.criteria.pointsMin === 'number' ? params.criteria.pointsMin : undefined
  const pointsMax = typeof params.criteria.pointsMax === 'number' ? params.criteria.pointsMax : undefined

  const where: any = { lineAccountId: params.lineAccountId }
  if (typeof isBlocked === 'boolean') where.isBlocked = isBlocked
  if (tagNames.length > 0) {
    where.tags = {
      some: {
        name: { in: tagNames },
      },
    }
  }

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      pointsTransactions: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { balance: true },
      },
    },
  })

  const matched = customers
    .map((c) => ({ id: c.id, balance: c.pointsTransactions[0]?.balance ?? 0 }))
    .filter((c) => {
      if (typeof pointsMin === 'number' && c.balance < pointsMin) return false
      if (typeof pointsMax === 'number' && c.balance > pointsMax) return false
      return true
    })

  const matchedIds = matched.map((c) => c.id)

  // Sync segment members table.
  await prisma.$transaction(async (tx) => {
    // Remove members no longer matching.
    await tx.segmentMember.deleteMany({
      where: {
        segmentId: params.segmentId,
        customerId: { notIn: matchedIds },
      },
    })

    if (matchedIds.length > 0) {
      await tx.segmentMember.createMany({
        data: matchedIds.map((customerId) => ({
          segmentId: params.segmentId,
          customerId,
        })),
        skipDuplicates: true,
      })
    }

    await tx.segment.update({
      where: { id: params.segmentId, lineAccountId: params.lineAccountId },
      data: { memberCount: matchedIds.length, criteria: params.criteria as any },
    })
  })

  return { memberCount: matchedIds.length }
}

