import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { createAutoTagManager } from '@/lib/services/auto-tag-manager'

// Verify LINE signature
function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) return false

  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')

  return hash === signature
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-line-signature')
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 401 })
    }

    const body = await request.text()
    
    // Verify signature
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(body)
    const events = data.events || []

    for (const event of events) {
      await handleEvent(event)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleEvent(event: any) {
  const { type, source, message, timestamp } = event

  // Get or create LINE user
  const lineUserId = source.userId
  if (!lineUserId) return

  // Find LINE account (assume default for now)
  const lineAccount = await prisma.lineAccount.findFirst({
    where: { isDefault: true },
  })

  if (!lineAccount) {
    console.error('No default LINE account found')
    return
  }

  // Get or create user
  let user = await prisma.lineUser.findFirst({
    where: {
      lineUserId,
      lineAccountId: lineAccount.id,
    },
    select: {
      id: true,
      lineAccountId: true,
      displayName: true,
      pictureUrl: true,
    },
  })

  if (!user) {
    // Create new user
    user = await prisma.lineUser.create({
      data: {
        lineUserId,
        lineAccountId: lineAccount.id,
        displayName: source.displayName || null,
        lastInteraction: new Date(),
      },
      select: { id: true },
    })

    // Trigger auto-tagging for new follower
    const autoTagManager = createAutoTagManager(lineAccount.id)
    await autoTagManager.onFollow(user.id)
  } else {
    // Update last interaction
    await prisma.lineUser.update({
      where: { id: user.id },
      data: { lastInteraction: new Date() },
      select: { id: true },
    })
  }

  // Handle different event types
  switch (type) {
    case 'message':
      await handleMessage(user, lineAccount.id, message, event.replyToken)
      break

    case 'follow':
      await handleFollow(user, lineAccount.id)
      break

    case 'unfollow':
      await handleUnfollow(user)
      break

    case 'postback':
      await handlePostback(user, event.postback)
      break

    default:
      console.log('Unhandled event type:', type)
  }
}

async function handleMessage(
  user: any,
  lineAccountId: number,
  message: any,
  replyToken: string | null
) {
  // Save message to database
  const messageType = message.type
  let content = null
  let mediaUrl = null
  let metadata = null

  switch (messageType) {
    case 'text':
      content = message.text
      break

    case 'image':
      mediaUrl = message.id // Store message ID, will fetch actual URL later
      break

    case 'video':
      mediaUrl = message.id
      break

    case 'audio':
      mediaUrl = message.id
      break

    case 'file':
      mediaUrl = message.id
      metadata = JSON.stringify({
        fileName: message.fileName,
        fileSize: message.fileSize,
      })
      break

    case 'location':
      metadata = JSON.stringify({
        latitude: message.latitude,
        longitude: message.longitude,
        address: message.address,
      })
      break

    case 'sticker':
      metadata = JSON.stringify({
        packageId: message.packageId,
        stickerId: message.stickerId,
      })
      break
  }

  await prisma.message.create({
    data: {
      userId: user.id,
      lineAccountId,
      direction: 'incoming',
      messageType,
      content,
      mediaUrl,
      metadata,
      replyToken,
      isRead: false,
    },
  })

  // Trigger auto-tagging based on message
  if (content) {
    const autoTagManager = createAutoTagManager(lineAccountId)
    await autoTagManager.onMessage(user.id, content)
  }
}

async function handleFollow(user: any, lineAccountId: number) {
  await prisma.lineUser.update({
    where: { id: user.id },
    data: { isBlocked: false },
    select: { id: true },
  })

  // Trigger auto-tagging for follow
  const autoTagManager = createAutoTagManager(lineAccountId)
  await autoTagManager.onFollow(user.id)
}

async function handleUnfollow(user: any) {
  await prisma.lineUser.update({
    where: { id: user.id },
    data: { isBlocked: true },
    select: { id: true },
  })
}

async function handlePostback(user: any, postback: any) {
  // Handle postback data (e.g., from rich menu, flex message buttons)
  console.log('Postback data:', postback.data)
  
  // You can implement custom logic here based on postback.data
}
