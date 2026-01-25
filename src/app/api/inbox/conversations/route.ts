import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const tagId = searchParams.get('tagId')
    const search = searchParams.get('search')
    const assignedTo = searchParams.get('assignedTo')
    const cursor = searchParams.get('cursor')

    const skip = cursor ? 1 : (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Only restrict by lineAccountId for non-super_admin users
    if (session.user.role !== 'super_admin' && session.user.lineAccountId) {
      where.lineAccountId = session.user.lineAccountId
    }

    if (status && status !== 'all') {
      where.chatStatus = status
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (tagId) {
      where.tagAssignments = {
        some: { tagId },
      }
    }

    if (assignedTo) {
      where.conversationAssignments = {
        some: { adminId: assignedTo, status: 'active' },
      }
    }

    // Get users with their latest messages
    const users = await prisma.lineUser.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tagAssignments: {
          include: { tag: true },
        },
        conversationAssignments: {
          where: { status: 'active' },
          include: {
            admin: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                direction: 'incoming',
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: { lastInteraction: 'desc' },
      take: limit,
      skip,
      ...(cursor && { cursor: { id: cursor } }),
    })

    // Get total count
    const total = await prisma.lineUser.count({ where })

    // Transform to conversation format
    const conversations = users.map((user) => ({
      id: user.id,
      user: {
        id: user.id,
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
        address: user.address,
        province: user.province,
        membershipLevel: user.membershipLevel,
        tier: user.tier,
        points: user.points,
        totalSpent: user.totalSpent,
        orderCount: user.orderCount,
        lastInteraction: user.lastInteraction?.toISOString() || null,
        chatStatus: user.chatStatus,
        isBlocked: user.isBlocked,
        isRegistered: user.isRegistered,
        createdAt: user.createdAt.toISOString(),
      },
      lastMessage: user.messages[0]
        ? {
            id: user.messages[0].id,
            userId: user.messages[0].userId,
            direction: user.messages[0].direction,
            messageType: user.messages[0].messageType,
            content: user.messages[0].content,
            mediaUrl: user.messages[0].mediaUrl,
            metadata: user.messages[0].metadata
              ? JSON.parse(user.messages[0].metadata)
              : null,
            isRead: user.messages[0].isRead,
            sentBy: user.messages[0].sentBy,
            replyToId: user.messages[0].replyToId,
            createdAt: user.messages[0].createdAt.toISOString(),
            updatedAt: user.messages[0].updatedAt.toISOString(),
          }
        : null,
      unreadCount: user._count.messages,
      status: (user.chatStatus as any) || 'active',
      assignees: user.conversationAssignments.map((a) => ({
        id: a.admin.id,
        username: a.admin.username,
        displayName: a.admin.displayName,
        avatarUrl: a.admin.avatarUrl,
        role: a.admin.role,
      })),
      tags: user.tagAssignments.map((ta) => ({
        id: ta.tag.id,
        name: ta.tag.name,
        color: ta.tag.color,
        description: ta.tag.description,
        isAuto: ta.tag.isAuto,
        sortOrder: ta.tag.sortOrder,
      })),
      updatedAt: user.lastInteraction?.toISOString() || user.updatedAt.toISOString(),
    }))

    const nextCursor = users.length === limit ? users[users.length - 1].id : null

    return NextResponse.json({
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total,
        cursor: nextCursor,
      },
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
