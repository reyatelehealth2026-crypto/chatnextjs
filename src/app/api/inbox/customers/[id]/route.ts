import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    const parsedUserId = Number(userId)
    if (!Number.isFinite(parsedUserId)) {
      return NextResponse.json({ error: 'User id must be a number' }, { status: 400 })
    }

    const where: { id: number; lineAccountId?: number } = { id: parsedUserId }
    if (session.user.role !== 'super_admin' && session.user.lineAccountId) {
      where.lineAccountId = session.user.lineAccountId
    }

    const user = await prisma.lineUser.findFirst({
      where,
      include: {
        tagAssignments: {
          include: { tag: true },
        },
        conversationAssignees: {
          where: { status: 'active' },
          include: {
            admin: {
              select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tags = user.tagAssignments.map((ta) => ({
      id: ta.tag.id.toString(),
      name: ta.tag.name,
      color: ta.tag.color ?? '#3B82F6',
      description: ta.tag.description,
      isAuto: ta.tag.tagType !== 'manual',
      sortOrder: ta.tag.priority ?? 0,
    }))

    const assignees = user.conversationAssignees.map((assignment) => ({
      id: assignment.admin.id.toString(),
      username: assignment.admin.username,
      email: assignment.admin.email,
      displayName: assignment.admin.displayName,
      avatarUrl: assignment.admin.avatarUrl,
      role: assignment.admin.role,
      isActive: assignment.admin.isActive ?? true,
    }))

    return NextResponse.json({
      data: {
        user: {
          id: user.id.toString(),
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          statusMessage: user.statusMessage,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          birthDate: user.birthDate?.toISOString() || null,
          gender: user.gender,
          weight: user.weight,
          height: user.height,
          address: user.address,
          district: user.district,
          province: user.province,
          postalCode: user.postalCode,
          memberId: user.memberId,
          membershipLevel: user.membershipLevel,
          tier: user.tier,
          points: user.points,
          totalPoints: user.totalPoints,
          availablePoints: user.availablePoints,
          usedPoints: user.usedPoints,
          loyaltyPoints: user.loyaltyPoints,
          totalSpent: user.totalSpent,
          orderCount: user.orderCount,
          lastInteraction: user.lastInteraction?.toISOString() || null,
          chatStatus: user.chatStatus,
          isBlocked: user.isBlocked,
          isRegistered: user.isRegistered,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        tags,
        assignees,
        points: {
          total: user.totalPoints,
          available: user.availablePoints,
          used: user.usedPoints,
          loyalty: user.loyaltyPoints,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching customer profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer profile' },
      { status: 500 }
    )
  }
}
