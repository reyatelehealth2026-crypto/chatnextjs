import crypto from 'crypto'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendSseEvent } from '@/lib/sse'
import { findAutoReply } from '@/lib/auto-reply'
import { sendLineTextMessage } from '@/lib/line'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  let payload: any
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  // Identify tenant (LINE uses `destination` as channelId).
  const destination = typeof payload?.destination === 'string' ? payload.destination : null
  if (!destination) {
    return new Response('Bad Request', { status: 400 })
  }

  const lineAccount = await prisma.lineAccount.findUnique({
    where: { lineChannelId: destination },
    select: { id: true, lineChannelSecret: true, lineAccessToken: true },
  })
  if (!lineAccount) {
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

  const events = Array.isArray(payload?.events) ? payload.events : []

  for (const event of events) {
    try {
      if (event?.type !== 'message') continue
      if (event?.source?.type !== 'user') continue

      const lineUserId =
        typeof event?.source?.userId === 'string' ? event.source.userId : null
      const messageId =
        typeof event?.message?.id === 'string' ? event.message.id : null
      const messageType =
        typeof event?.message?.type === 'string' ? event.message.type : null

      if (!lineUserId || !messageId || !messageType) continue

      let content = ''
      let dbMessageType: any = 'TEXT'
      if (messageType === 'text') {
        content = typeof event?.message?.text === 'string' ? event.message.text : ''
        dbMessageType = 'TEXT'
      } else {
        content = `[${messageType}]`
        dbMessageType = 'FILE'
      }

      // Ensure customer exists.
      const customer = await prisma.customer.upsert({
        where: {
          lineAccountId_lineUserId: {
            lineAccountId: lineAccount.id,
            lineUserId,
          },
        },
        update: { lastContactAt: new Date() },
        create: {
          lineAccountId: lineAccount.id,
          lineUserId,
          displayName: lineUserId,
          lastContactAt: new Date(),
        },
        select: { id: true },
      })

      // Find active conversation (OPEN/PENDING), else create new.
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          lineAccountId: lineAccount.id,
          customerId: customer.id,
          status: { in: ['OPEN', 'PENDING'] },
        },
        orderBy: { lastMessageAt: 'desc' },
        select: { id: true },
      })

      const conversationId =
        existingConversation?.id ??
        (
          await prisma.conversation.create({
            data: {
              lineAccountId: lineAccount.id,
              customerId: customer.id,
              status: 'OPEN',
              lastMessageAt: new Date(),
            },
            select: { id: true },
          })
        ).id

      // Idempotent insert by lineMessageId.
      await prisma.message.create({
        data: {
          conversationId,
          content,
          direction: 'INBOUND',
          lineMessageId: messageId,
          messageType: dbMessageType,
        },
      })

      await prisma.conversation.update({
        where: { id: conversationId, lineAccountId: lineAccount.id },
        data: {
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
        },
      })

      sendSseEvent(lineAccount.id, 'new-message', { conversationId })
      sendSseEvent(lineAccount.id, 'conversation-updated', { conversationId })

      // Auto-reply (best effort) for inbound text messages.
      if (messageType === 'text' && content) {
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
            console.error('Auto-reply failed:', err)
          }
        }
      }
    } catch (error: any) {
      // P2002 unique constraint => already processed (idempotency).
      if (typeof error?.code === 'string' && error.code === 'P2002') {
        continue
      }
      console.error('LINE webhook event error:', error)
    }
  }

  return new Response('OK', { status: 200 })
}
