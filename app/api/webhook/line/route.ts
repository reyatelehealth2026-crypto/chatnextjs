import crypto from 'crypto'
import { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import prisma from '@/lib/prisma'
import { sendSseEvent } from '@/lib/sse'
import { findAutoReply } from '@/lib/auto-reply'
import { sendLineTextMessage, getLineProfile, downloadLineContent } from '@/lib/line'
import { lineWebhookPayloadSchema } from '@/lib/line-webhook-schema'
import { createS3Client, uploadToS3, getPublicUrl, getS3Config } from '@/lib/s3'
import { generateImageThumbnail } from '@/lib/thumbnails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/webhook/line
 * 
 * LINE uses GET request to verify webhook URL.
 * Must return 200 OK for verification to succeed.
 */
export async function GET() {
  return new Response('OK', { status: 200 })
}

function verifyLineSignature(params: {
  channelSecret: string
  body: string
  signature: string
}) {
  const mac = crypto
    .createHmac('sha256', params.channelSecret)
    .update(params.body)
    .digest('base64')

  // LINE signature is base64 string.
  const a = Buffer.from(mac)
  const b = Buffer.from(params.signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * POST /api/webhook/line
 *
 * Minimal receiver:
 * - verifies signature (per tenant via destination/channelId)
 * - stores inbound text messages (idempotent by lineMessageId)
 * - fans out SSE events for UI refresh
 *
 * Requirements: 27.1, 27.2, 27.7
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-line-signature')
  const bodyText = await request.text()

  // Parse and validate payload
  let rawPayload: unknown
  try {
    rawPayload = JSON.parse(bodyText)
  } catch {
    return new Response('Bad Request: Invalid JSON', { status: 400 })
  }

  // Validate payload structure
  const parseResult = lineWebhookPayloadSchema.safeParse(rawPayload)
  if (!parseResult.success) {
    Sentry.captureException(new Error('LINE webhook validation error'), {
      extra: { errors: parseResult.error.issues, payload: rawPayload },
    })
    return new Response('Bad Request: Invalid payload structure', { status: 400 })
  }

  const payload = parseResult.data

  // LINE verification request - empty events array or no events
  if (payload.events.length === 0) {
    // This is a verification request from LINE Console, return 200 OK
    return new Response('OK', { status: 200 })
  }

  // Find LineAccount - try by destination first, then fallback to finding by signature
  const destination = payload.destination ?? null

  let lineAccount = null

  // Try to find by destination (Channel ID or Bot User ID)
  if (destination) {
    lineAccount = await prisma.lineAccount.findUnique({
      where: { lineChannelId: destination },
      select: { id: true, lineChannelSecret: true, lineAccessToken: true },
    })
  }

  // If not found by destination, try to find by verifying signature with each account
  if (!lineAccount && signature) {
    const allAccounts = await prisma.lineAccount.findMany({
      select: { id: true, lineChannelId: true, lineChannelSecret: true, lineAccessToken: true },
    })

    for (const account of allAccounts) {
      const isValid = verifyLineSignature({
        channelSecret: account.lineChannelSecret,
        body: bodyText,
        signature,
      })
      if (isValid) {
        lineAccount = account
        break
      }
    }
  }

  if (!lineAccount) {
    Sentry.captureMessage('LINE webhook: No matching LineAccount found', {
      level: 'warning',
      extra: { destination },
    })
    return new Response('Not Found', { status: 404 })
  }

  if (!signature) {
    return new Response('Unauthorized', { status: 401 })
  }

  const ok = verifyLineSignature({
    channelSecret: lineAccount.lineChannelSecret,
    body: bodyText,
    signature,
  })

  if (!ok) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Process events
  for (const event of payload.events) {
    try {
      // Type guard: only process message events
      if (event.type !== 'message') continue
      if (!('source' in event)) continue
      if (event.source.type !== 'user') continue
      if (!event.source.userId) continue

      const lineUserId = event.source.userId
      const messageId = event.message.id
      const messageType = event.message.type

      let content = ''
      let dbMessageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION' = 'TEXT'
      let metadata: any = null
      const attachments: Array<{
        fileName: string
        fileSize: number
        mimeType: string
        storageKey: string
        url: string
        thumbnailUrl?: string
      }> = []

      if (messageType === 'text' && 'text' in event.message) {
        content = event.message.text
        dbMessageType = 'TEXT'
      } else if (messageType === 'image') {
        content = '[Image]'
        dbMessageType = 'IMAGE'

        // Download image from LINE and upload to R2
        try {
          const s3Client = createS3Client()
          const s3Config = getS3Config()

          if (s3Client && s3Config) {
            // Download image content
            const imageBuffer = Buffer.from(
              await downloadLineContent({
                messageId,
                channelAccessToken: lineAccount.lineAccessToken,
              })
            )

            // Upload original image
            const storageKey = `${lineAccount.id}/messages/${Date.now()}-${messageId}.jpg`
            await uploadToS3({
              buffer: imageBuffer,
              storageKey,
              mimeType: 'image/jpeg',
              client: s3Client,
              bucket: s3Config.bucket,
            })

            // Generate and upload thumbnail
            const thumbnailBuffer = await generateImageThumbnail(imageBuffer)
            const thumbnailKey = `${lineAccount.id}/messages/${Date.now()}-${messageId}-thumb.jpg`
            await uploadToS3({
              buffer: thumbnailBuffer,
              storageKey: thumbnailKey,
              mimeType: 'image/jpeg',
              client: s3Client,
              bucket: s3Config.bucket,
            })

            // Add to attachments array
            attachments.push({
              fileName: `image-${messageId}.jpg`,
              fileSize: imageBuffer.length,
              mimeType: 'image/jpeg',
              storageKey,
              url: getPublicUrl(storageKey),
              thumbnailUrl: getPublicUrl(thumbnailKey),
            })
          }
        } catch (err) {
          Sentry.captureException(err, {
            tags: { component: 'image-download' },
            extra: { messageId, lineAccountId: lineAccount.id },
          })
          // Continue with placeholder if download fails
        }
      } else if (messageType === 'location' && 'latitude' in event.message) {
        const loc = event.message
        content = `[Location: ${loc.title || 'Location'}]`
        dbMessageType = 'LOCATION'
        metadata = {
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address || null,
          title: loc.title || null,
        }
      } else {
        content = `[${messageType}]`
        dbMessageType = 'FILE'
      }

      // Sync profile from LINE if possible.
      const profile = await getLineProfile(lineUserId, lineAccount.lineAccessToken)
      const displayName = profile?.displayName ?? lineUserId
      const pictureUrl = profile?.pictureUrl ?? null
      const statusMessage = profile?.statusMessage ?? null

      // Ensure customer exists.
      const customer = await prisma.customer.upsert({
        where: {
          lineAccountId_lineUserId: {
            lineAccountId: lineAccount.id,
            lineUserId,
          },
        },
        update: {
          lastContactAt: new Date(),
          // Update profile if available
          ...(profile ? { displayName, pictureUrl, statusMessage } : {}),
        },
        create: {
          lineAccountId: lineAccount.id,
          lineUserId,
          displayName,
          pictureUrl,
          statusMessage,
          lastContactAt: new Date(),
        },
        select: { id: true },
      })

      // Continuous Chat Mode: Find latest conversation regardless of status
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          lineAccountId: lineAccount.id,
          customerId: customer.id,
        },
        orderBy: { lastMessageAt: 'desc' },
        select: { id: true, status: true },
      })

      let conversationId = existingConversation?.id

      if (conversationId) {
        // Reuse and Open if needed
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            status: 'OPEN',
            lastMessageAt: new Date(),
            unreadCount: { increment: 1 },
          },
        })
      } else {
        // Create new
        const newConv = await prisma.conversation.create({
          data: {
            lineAccountId: lineAccount.id,
            customerId: customer.id,
            status: 'OPEN',
            lastMessageAt: new Date(),
            unreadCount: 1,
          },
          select: { id: true },
        })
        conversationId = newConv.id
      }

      // Idempotent upsert by lineMessageId.
      // Check if message already exists to prevent duplicate auto-replies
      const existingMessage = await prisma.message.findUnique({
        where: { lineMessageId: messageId },
        select: { id: true },
      })

      const isNewMessage = !existingMessage

      const message = await prisma.message.upsert({
        where: { lineMessageId: messageId },
        create: {
          conversationId,
          content,
          direction: 'INBOUND',
          lineMessageId: messageId,
          messageType: dbMessageType as any,
          metadata: metadata || undefined,
        },
        update: {},
        select: { id: true },
      })

      // Create file attachments if any
      if (attachments.length > 0) {
        await prisma.fileAttachment.createMany({
          data: attachments.map((a) => ({
            messageId: message.id,
            fileName: a.fileName,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
            storageKey: a.storageKey,
            url: a.url,
            thumbnailUrl: a.thumbnailUrl || null,
          })),
        })
      }

      sendSseEvent(lineAccount.id, 'new-message', { conversationId })
      sendSseEvent(lineAccount.id, 'conversation-updated', { conversationId })

      // Auto-reply (best effort) for inbound text messages.
      // Only trigger auto-reply for NEW messages to prevent duplicate responses
      if (isNewMessage && messageType === 'text' && content) {
        const match = await findAutoReply({
          lineAccountId: lineAccount.id,
          messageText: content,
        })

        if (match) {
          try {
            await sendLineTextMessage({
              channelAccessToken: lineAccount.lineAccessToken,
              to: lineUserId,
              text: match.responseContent,
            })

            await prisma.$transaction(async (tx) => {
              const conv = await tx.conversation.findUnique({
                where: { id: conversationId, lineAccountId: lineAccount.id },
                select: { firstResponseAt: true },
              })

              await tx.message.create({
                data: {
                  conversationId,
                  content: match.responseContent,
                  direction: 'OUTBOUND',
                  senderId: null,
                  messageType: 'TEXT',
                  metadata: { autoReplyRuleId: match.ruleId },
                },
              })

              await tx.autoReplyRule.update({
                where: { id: match.ruleId },
                data: { usageCount: { increment: 1 } },
              })

              await tx.conversation.update({
                where: { id: conversationId, lineAccountId: lineAccount.id },
                data: {
                  lastMessageAt: new Date(),
                  firstResponseAt: conv?.firstResponseAt ? undefined : new Date(),
                },
              })
            })

            sendSseEvent(lineAccount.id, 'new-message', { conversationId })
            sendSseEvent(lineAccount.id, 'conversation-updated', { conversationId })
          } catch (err) {
            Sentry.captureException(err, {
              tags: { component: 'auto-reply' },
              extra: { conversationId, lineAccountId: lineAccount.id },
            })
          }
        }
      }
    } catch (error: any) {
      // P2002 unique constraint => already processed (idempotency).
      if (typeof error?.code === 'string' && error.code === 'P2002') {
        continue
      }
      Sentry.captureException(error, {
        tags: { component: 'webhook-event-processing' },
        extra: { event, lineAccountId: lineAccount.id },
      })
    }
  }

  return new Response('OK', { status: 200 })
}
