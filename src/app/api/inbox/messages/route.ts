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
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const cursor = searchParams.get('cursor')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const skip = cursor ? 1 : (page - 1) * limit

    const messages = await prisma.message.findMany({
      where: { userId },
      include: {
        replyTo: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      ...(cursor && { cursor: { id: cursor } }),
    })

    const total = await prisma.message.count({ where: { userId } })

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        userId,
        direction: 'incoming',
        isRead: false,
      },
      data: { isRead: true },
    })

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      userId: msg.userId,
      direction: msg.direction,
      messageType: msg.messageType,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      isRead: msg.isRead,
      sentBy: msg.sentBy,
      replyToId: msg.replyToId,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            content: msg.replyTo.content,
            messageType: msg.replyTo.messageType,
          }
        : null,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    }))

    // Reverse to show oldest first
    formattedMessages.reverse()

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

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

    // Get the user to find their line account
    const user = await prisma.lineUser.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        userId,
        lineAccountId: user.lineAccountId,
        direction: 'outgoing',
        messageType,
        content,
        mediaUrl,
        metadata: metadata ? JSON.stringify(metadata) : null,
        sentBy: session.user.id,
        replyToId,
        isRead: true,
      },
      include: {
        replyTo: true,
      },
    })

    // Update user's last interaction
    await prisma.lineUser.update({
      where: { id: userId },
      data: { lastInteraction: new Date() },
    })

    return NextResponse.json({
      id: message.id,
      userId: message.userId,
      direction: message.direction,
      messageType: message.messageType,
      content: message.content,
      mediaUrl: message.mediaUrl,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      isRead: message.isRead,
      sentBy: message.sentBy,
      replyToId: message.replyToId,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            content: message.replyTo.content,
            messageType: message.replyTo.messageType,
          }
        : null,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
