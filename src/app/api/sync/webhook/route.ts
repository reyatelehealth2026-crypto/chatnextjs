import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// This endpoint allows the old system (v1) to sync messages/events to the new system
// Protected by INTERNAL_API_SECRET

export async function POST(request: NextRequest) {
  try {
    // 1. Check Authentication
    const authHeader = request.headers.get('authorization')
    const internalSecret = process.env.INTERNAL_API_SECRET || process.env.NEXTAUTH_SECRET

    if (!authHeader || authHeader !== `Bearer ${internalSecret}`) {
      console.error('Sync webhook: Unauthorized - missing or invalid auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse Payload
    const body = await request.json()
    const { event, data } = body

    if (!event || !data) {
      console.error('Sync webhook: Invalid payload - missing event or data', { event, hasData: !!data })
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.log(`Sync webhook: Received ${event} event for user ${data.lineUserId}`)

    // 3. Handle Events
    if (event === 'message') {
      await handleSyncMessage(data)
    } else if (event === 'user_update') {
      await handleSyncUser(data)
    } else {
      console.warn(`Sync webhook: Unknown event type: ${event}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sync webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function normalizePictureUrl(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > 255 ? trimmed.slice(0, 255) : trimmed
}

async function handleSyncMessage(data: any) {
  const {
    lineUserId,
    displayName,
    pictureUrl,
    direction, // 'incoming' | 'outgoing'
    type,      // 'text' | 'image' | ...
    content,
    mediaUrl,
    timestamp,
    lineAccountId // optional, ID of the LINE account
  } = data

  if (!lineUserId) return
  const safePictureUrl = normalizePictureUrl(pictureUrl)

  // 1. Resolve LineAccount
  // Convert lineAccountId to integer if provided (it comes as string from JSON)
  let accountId: number | undefined = lineAccountId ? parseInt(String(lineAccountId), 10) : undefined
  if (accountId && isNaN(accountId)) {
    accountId = undefined
  }

  if (!accountId) {
    const defaultAccount = await prisma.lineAccount.findFirst({
      where: { isDefault: true }
    })
    accountId = defaultAccount?.id
    
    // If still no account, try to get any active account
    if (!accountId) {
      const anyAccount = await prisma.lineAccount.findFirst({
        where: { isActive: true }
      })
      accountId = anyAccount?.id
    }
  }

  if (!accountId) {
    console.error(`No LINE account found for sync. lineUserId: ${lineUserId}, lineAccountId: ${lineAccountId}`)
    // Try to create a default account if none exists
    const newAccount = await prisma.lineAccount.create({
      data: {
        name: 'Default Account',
        channelSecret: 'default',
        channelAccessToken: 'default',
        isDefault: true,
        isActive: true
      }
    })
    accountId = newAccount.id
    console.log(`Created default LINE account with ID: ${accountId}`)
  }

  // 2. Find or Create User
  let user = await prisma.lineUser.findUnique({
    where: {
      lineAccountId_lineUserId: {
        lineAccountId: accountId as number,
        lineUserId: lineUserId
      }
    }
  })

  if (!user) {
    user = await prisma.lineUser.create({
      data: {
        lineAccountId: accountId as number,
        lineUserId: lineUserId,
        displayName: displayName || 'Unknown',
        pictureUrl: safePictureUrl,
        isRegistered: false,
        lastInteraction: new Date(timestamp || Date.now())
      }
    })
  } else {
    // Update basic info if provided
    if (displayName || safePictureUrl) {
      await prisma.lineUser.update({
        where: { id: user.id },
        data: {
          displayName: displayName || user.displayName,
          pictureUrl: safePictureUrl || user.pictureUrl,
          lastInteraction: new Date(timestamp || Date.now())
        }
      })
    }
  }

  // 3. Create Message
  await prisma.message.create({
    data: {
      lineAccountId: accountId as number,
      userId: user.id,
      direction: direction || 'incoming',
      messageType: type || 'text',
      content: content || null,
      mediaUrl: mediaUrl || null,
      createdAt: timestamp ? new Date(timestamp) : new Date(),
      isRead: direction === 'outgoing' ? true : false
    }
  })
}

async function handleSyncUser(data: any) {
  // Logic to sync user profile updates
  const { lineUserId, ...updates } = data
  if (!lineUserId) return
  const safePictureUrl = normalizePictureUrl(updates?.pictureUrl)

  // Need account ID to find user
  // This simplistic version assumes single account or needs lookup
  // For now, we'll try to update across all accounts with this lineUserId (if multiple)
  // or just the default one.
  
  const users = await prisma.lineUser.findMany({
    where: { lineUserId }
  })

  for (const user of users) {
    await prisma.lineUser.update({
      where: { id: user.id },
      data: {
        ...updates,
        ...(safePictureUrl ? { pictureUrl: safePictureUrl } : {}),
        updatedAt: new Date()
      }
    })
  }
}
