import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendLineMessage } from '@/lib/php-bridge'
import { broadcastRealtimeEvent } from '@/lib/realtime'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const cursor = searchParams.get('cursor')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const markRead = searchParams.get('markRead')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const parsedUserId = Number(userId)
    if (!Number.isFinite(parsedUserId)) {
      return NextResponse.json({ error: 'userId must be a number' }, { status: 400 })
    }

    const lineUser = await prisma.lineUser.findUnique({
      where: { id: parsedUserId },
      select: { id: true, lineAccountId: true },
    })

    if (!lineUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (
      session.user.role !== 'super_admin' &&
      session.user.lineAccountId &&
      lineUser.lineAccountId !== session.user.lineAccountId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const cursorId = cursor ? Number(cursor) : null
    if (cursor && !Number.isFinite(cursorId)) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    }

    const skip = cursorId ? 1 : (page - 1) * limit

    const fromDate = startDate ? new Date(startDate) : null
    const toDate = endDate ? new Date(endDate) : null
    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const where: {
      userId: number
      createdAt?: { gte?: Date; lte?: Date }
    } = { userId: parsedUserId }
    if (fromDate || toDate) {
      where.createdAt = {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      }
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        replyTo: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      skip,
      ...(cursorId && { cursor: { id: cursorId } }),
    })

    const total = await prisma.message.count({ where })

    const shouldMarkRead = markRead !== 'false' && markRead !== '0'
    if (shouldMarkRead) {
      await prisma.message.updateMany({
        where: {
          userId: parsedUserId,
          direction: 'incoming',
          isRead: false,
        },
        data: { isRead: true },
      })
    }

    const formattedMessages = messages.map((msg) => ({
      id: msg.id.toString(),
      userId: msg.userId.toString(),
      direction: msg.direction,
      messageType: msg.messageType,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      isRead: msg.isRead,
      sentBy: msg.sentBy,
      replyToId: msg.replyToId ? msg.replyToId.toString() : null,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id.toString(),
            content: msg.replyTo.content,
            messageType: msg.replyTo.messageType,
          }
        : null,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    }))

    // Reverse to show oldest first
    formattedMessages.reverse()

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id.toString() : null

    return NextResponse.json({
      data: formattedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
        cursor: nextCursor,
      },
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, content, messageType = 'text', replyToId, mediaUrl, metadata } = body

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'userId and content are required' },
        { status: 400 }
      )
    }

    const parsedUserId = Number(userId)
    if (!Number.isFinite(parsedUserId)) {
      return NextResponse.json({ error: 'userId must be a number' }, { status: 400 })
    }

    const parsedReplyToId =
      replyToId !== undefined && replyToId !== null ? Number(replyToId) : null
    if (replyToId && !Number.isFinite(parsedReplyToId)) {
      return NextResponse.json({ error: 'replyToId must be a number' }, { status: 400 })
    }

    // Get the user to find their line account
    const user = await prisma.lineUser.findUnique({
      where: { id: parsedUserId },
      select: { id: true, lineAccountId: true, lineUserId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (
      session.user.role !== 'super_admin' &&
      session.user.lineAccountId &&
      user.lineAccountId !== session.user.lineAccountId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!process.env.PHP_API_URL) {
      return NextResponse.json(
        { error: 'PHP_API_URL is not configured' },
        { status: 500 }
      )
    }

    const sendResult = await sendLineMessage({
      userId: user.lineUserId,
      message: content,
      type: messageType,
    })

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send message' },
        { status: 502 }
      )
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        userId: parsedUserId,
        lineAccountId: user.lineAccountId,
        direction: 'outgoing',
        messageType,
        content,
        mediaUrl,
        metadata: metadata ? JSON.stringify(metadata) : null,
        sentBy: session.user.id,
        replyToId: parsedReplyToId,
        isRead: true,
      },
      include: {
        replyTo: true,
      },
    })

    // Update user's last interaction
    await prisma.lineUser.update({
      where: { id: parsedUserId },
      data: { lastInteraction: new Date() },
      select: { id: true },
    })

    const responsePayload = {
      id: message.id.toString(),
      userId: message.userId.toString(),
      direction: message.direction,
      messageType: message.messageType,
      content: message.content,
      mediaUrl: message.mediaUrl,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      isRead: message.isRead,
      sentBy: message.sentBy,
      replyToId: message.replyToId ? message.replyToId.toString() : null,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id.toString(),
            content: message.replyTo.content,
            messageType: message.replyTo.messageType,
          }
        : null,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    }

    broadcastRealtimeEvent({
      type: 'new_message',
      data: {
        conversationId: parsedUserId.toString(),
        message: responsePayload,
      },
      timestamp: Date.now(),
    })

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
