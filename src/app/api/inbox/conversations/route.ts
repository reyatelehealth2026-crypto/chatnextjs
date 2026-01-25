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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status')
    const tagId = searchParams.get('tagId')
    const tagIdsParam = searchParams.get('tagIds')
    const search = searchParams.get('search')
    const assignedTo = searchParams.get('assignedTo')
    const assignedToParam = searchParams.get('assignedToIds')
    const unreadOnly = searchParams.get('unreadOnly')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const cursor = searchParams.get('cursor')

    const cursorId = cursor ? Number(cursor) : null
    if (cursor && !Number.isFinite(cursorId)) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    }

    const skip = cursorId ? 1 : (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Only restrict by lineAccountId for non-super_admin users
    if (session.user.role !== 'super_admin' && session.user.lineAccountId) {
      where.lineAccountId = session.user.lineAccountId
    }

    if (status && status !== 'all') {
      where.chatStatus = status
    }

    const trimmedSearch = search?.trim()
    if (trimmedSearch) {
      where.OR = [
        { displayName: { contains: trimmedSearch } },
        { firstName: { contains: trimmedSearch } },
        { lastName: { contains: trimmedSearch } },
        { phone: { contains: trimmedSearch } },
        { email: { contains: trimmedSearch } },
        {
          messages: {
            some: {
              content: { contains: trimmedSearch },
            },
          },
        },
      ]
    }

    const tagIds = tagIdsParam
      ? tagIdsParam
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => Number.isFinite(id))
      : []

    if (tagIds.length > 0) {
      where.tagAssignments = {
        some: { tagId: { in: tagIds } },
      }
    } else if (tagId) {
      const parsedTagId = Number(tagId)
      if (!Number.isFinite(parsedTagId)) {
        return NextResponse.json({ error: 'tagId must be a number' }, { status: 400 })
      }
      where.tagAssignments = {
        some: { tagId: parsedTagId },
      }
    }

    const assignedToIds = assignedToParam
      ? assignedToParam
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => Number.isFinite(id))
      : []

    if (assignedToIds.length > 0) {
      where.conversationAssignees = {
        some: { adminId: { in: assignedToIds }, status: 'active' },
      }
    } else if (assignedTo) {
      const parsedAssignedTo = Number(assignedTo)
      if (!Number.isFinite(parsedAssignedTo)) {
        return NextResponse.json({ error: 'assignedTo must be a number' }, { status: 400 })
      }
      where.conversationAssignees = {
        some: { adminId: parsedAssignedTo, status: 'active' },
      }
    }

    if (unreadOnly === 'true' || unreadOnly === '1') {
      where.messages = {
        some: {
          direction: 'incoming',
          isRead: false,
        },
      }
    }

    if (startDate || endDate) {
      const fromDate = startDate ? new Date(startDate) : null
      const toDate = endDate ? new Date(endDate) : null
      if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
      }
      where.lastInteraction = {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      }
    }

    // Get users with their latest messages
    const users = await prisma.lineUser.findMany({
      where,
      select: {
        id: true,
        lineUserId: true,
        displayName: true,
        pictureUrl: true,
        statusMessage: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        gender: true,
        address: true,
        province: true,
        membershipLevel: true,
        tier: true,
        points: true,
        totalSpent: true,
        orderCount: true,
        lastInteraction: true,
        chatStatus: true,
        isBlocked: true,
        isRegistered: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            userId: true,
            direction: true,
            messageType: true,
            content: true,
            mediaUrl: true,
            metadata: true,
            isRead: true,
            sentBy: true,
            replyToId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        tagAssignments: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
                tagType: true,
                priority: true,
              },
            },
          },
        },
        conversationAssignees: {
          where: { status: 'active' },
          select: {
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
      orderBy: [{ lastInteraction: 'desc' }, { id: 'desc' }],
      take: limit,
      skip,
      ...(cursorId && { cursor: { id: cursorId } }),
    })

    // Get total count
    const total = await prisma.lineUser.count({ where })

    // Transform to conversation format
    const conversations = users.map((user) => ({
      id: user.id.toString(),
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
        birthDate: null,
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
            id: user.messages[0].id.toString(),
            userId: user.messages[0].userId.toString(),
            direction: user.messages[0].direction,
            messageType: user.messages[0].messageType,
            content: user.messages[0].content,
            mediaUrl: user.messages[0].mediaUrl,
            metadata: user.messages[0].metadata
              ? JSON.parse(user.messages[0].metadata)
              : null,
            isRead: user.messages[0].isRead,
            sentBy: user.messages[0].sentBy,
            replyToId: user.messages[0].replyToId
              ? user.messages[0].replyToId.toString()
              : null,
            createdAt: user.messages[0].createdAt.toISOString(),
            updatedAt: user.messages[0].updatedAt.toISOString(),
          }
        : null,
      unreadCount: user._count.messages,
      status: (user.chatStatus as any) || 'active',
      assignees: user.conversationAssignees.map((a) => ({
        id: a.admin.id.toString(),
        username: a.admin.username,
        displayName: a.admin.displayName,
        avatarUrl: a.admin.avatarUrl,
        role: a.admin.role,
      })),
      tags: user.tagAssignments.map((ta) => ({
        id: ta.tag.id.toString(),
        name: ta.tag.name,
        color: ta.tag.color ?? '#3B82F6',
        description: ta.tag.description,
        isAuto: ta.tag.tagType !== 'manual',
        sortOrder: ta.tag.priority ?? 0,
      })),
      updatedAt: user.lastInteraction?.toISOString() || user.updatedAt.toISOString(),
    }))

    const nextCursor = users.length === limit ? users[users.length - 1].id.toString() : null

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
