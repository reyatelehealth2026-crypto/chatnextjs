import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { sendLineTextMessage } from '@/lib/line'
import { sendSseEvent } from '@/lib/sse'
import { sanitizeText } from '@/lib/sanitize'
import { enqueueBroadcast } from '@/lib/broadcast-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

async function resolveRecipients(params: {
  lineAccountId: string
  targetType: 'ALL' | 'SEGMENT' | 'CUSTOM'
  targetIds: string[]
}) {
  if (params.targetType === 'ALL') {
    return prisma.customer.findMany({
      where: { lineAccountId: params.lineAccountId },
      select: { id: true, lineUserId: true },
    })
  }

  if (params.targetType === 'CUSTOM') {
    return prisma.customer.findMany({
      where: { lineAccountId: params.lineAccountId, id: { in: params.targetIds } },
      select: { id: true, lineUserId: true },
    })
  }

  // SEGMENT
  const members = await prisma.segmentMember.findMany({
    where: { segmentId: { in: params.targetIds }, customer: { lineAccountId: params.lineAccountId } },
    select: { customer: { select: { id: true, lineUserId: true } } },
  })
  return members.map((m) => m.customer)
}

async function deliverBroadcast(broadcastId: string) {
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    include: {
      lineAccount: { select: { id: true, lineAccessToken: true } },
    },
  })
  if (!broadcast) return

  const recipients = await resolveRecipients({
    lineAccountId: broadcast.lineAccountId,
    targetType: broadcast.targetType as any,
    targetIds: broadcast.targetIds ?? [],
  })

  const unique = new Map<string, { id: string; lineUserId: string }>()
  for (const r of recipients) unique.set(r.lineUserId, r as any)
  const list = Array.from(unique.values())

  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: {
      status: 'SENDING',
      recipientCount: list.length,
      sentCount: 0,
      failedCount: 0,
    },
  })
  sendSseEvent(broadcast.lineAccountId, 'broadcast-updated', { broadcastId: broadcast.id })

  let sent = 0
  let failed = 0
  const rps = Math.max(1, Number(process.env.LINE_BROADCAST_RPS ?? 10))
  const delayMs = Math.ceil(1000 / rps)

  for (const r of list) {
    try {
      await sendLineTextMessage({
        channelAccessToken: broadcast.lineAccount.lineAccessToken,
        to: r.lineUserId,
        text: broadcast.content,
      })
      sent += 1
    } catch {
      failed += 1
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    if ((sent + failed) % 25 === 0) {
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { sentCount: sent, failedCount: failed },
      })
      sendSseEvent(broadcast.lineAccountId, 'broadcast-updated', { broadcastId: broadcast.id })
    }
  }

  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: {
      sentCount: sent,
      failedCount: failed,
      status: failed === 0 ? 'SENT' : sent > 0 ? 'SENT' : 'FAILED',
      sentAt: new Date(),
    },
  })
  sendSseEvent(broadcast.lineAccountId, 'broadcast-updated', { broadcastId: broadcast.id })
}

function scheduleDelivery(broadcastId: string, when: Date) {
  const delay = when.getTime() - Date.now()
  if (!Number.isFinite(delay) || delay <= 0) {
    enqueueBroadcast(broadcastId, deliverBroadcast)
    return
  }

  // Best-effort in-process scheduling (works for local/dev; serverless runtimes may not persist timers).
  const maxDelay = 2_147_483_647 // setTimeout max (~24.8 days)
  if (delay > maxDelay) return
  setTimeout(() => enqueueBroadcast(broadcastId, deliverBroadcast), delay)
}

/**
 * GET /api/inbox/broadcasts
 */
export const GET = withPermission('viewBroadcasts', async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20') || 20))
    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.broadcast.findMany({
        where: { lineAccountId: user.lineAccountId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.broadcast.count({ where: { lineAccountId: user.lineAccountId } }),
    ])

    const broadcasts = await Promise.all(
      items.map(async (b) => {
        const deliveryRate = b.recipientCount > 0 ? b.sentCount / b.recipientCount : null

        let responseRate: number | null = null
        if (b.sentAt && b.recipientCount > 0 && b.recipientCount <= 500) {
          const recipients = await resolveRecipients({
            lineAccountId: user.lineAccountId,
            targetType: b.targetType as any,
            targetIds: b.targetIds ?? [],
          })
          const lineUserIds = Array.from(new Set(recipients.map((r: any) => r.lineUserId)))
          const inbound = await prisma.message.findMany({
            where: {
              direction: 'INBOUND',
              createdAt: { gt: b.sentAt },
              conversation: {
                lineAccountId: user.lineAccountId,
                customer: { lineUserId: { in: lineUserIds } },
              },
            },
            select: { conversation: { select: { customer: { select: { lineUserId: true } } } } },
            take: 2000,
          })
          const responders = new Set(inbound.map((m) => m.conversation.customer.lineUserId))
          responseRate = responders.size / b.recipientCount
        }

        return {
          ...b,
          metrics: {
            deliveryRate,
            responseRate,
          },
        }
      })
    )

    return successResponse({ broadcasts, total, page, pageSize })
  } catch (error) {
    console.error('Error fetching broadcasts:', error)
    return errorResponse('Failed to fetch broadcasts', 500)
  }
})

/**
 * POST /api/inbox/broadcasts
 */
export const POST = withPermission('createBroadcasts', async (user, request: NextRequest) => {
  try {
    const body = (await request.json().catch(() => null)) as any

    const name = sanitizeText(body?.name, { maxLen: 120 })
    const content = sanitizeText(body?.content, { maxLen: 5000 })
    const targetType = body?.targetType as 'ALL' | 'SEGMENT' | 'CUSTOM'
    const targetIds = Array.isArray(body?.targetIds)
      ? body.targetIds.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim())
      : []
    const scheduledAt = parseIsoDate(body?.scheduledAt)
    const sendNow = Boolean(body?.sendNow)

    if (!name) return errorResponse('name is required', 400)
    if (!content) return errorResponse('content is required', 400)
    if (!['ALL', 'SEGMENT', 'CUSTOM'].includes(targetType)) {
      return errorResponse('targetType is invalid', 400)
    }
    if (targetType !== 'ALL' && targetIds.length === 0) {
      return errorResponse('targetIds is required', 400)
    }

    if (sendNow && !hasPermission(user.role, 'sendBroadcasts')) {
      return errorResponse('Insufficient permissions', 403)
    }

    const recipients = await resolveRecipients({
      lineAccountId: user.lineAccountId,
      targetType,
      targetIds,
    })
    const unique = new Set(recipients.map((r: any) => r.lineUserId))
    const recipientCount = unique.size

    const now = new Date()
    const shouldSchedule = scheduledAt && scheduledAt.getTime() > now.getTime()

    const broadcast = await prisma.broadcast.create({
      data: {
        lineAccountId: user.lineAccountId,
        name,
        content,
        targetType,
        targetIds: targetType === 'ALL' ? [] : targetIds,
        recipientCount,
        status: shouldSchedule ? 'SCHEDULED' : sendNow ? 'SENDING' : 'DRAFT',
        scheduledAt: shouldSchedule ? scheduledAt : null,
      } as any,
    })

    sendSseEvent(user.lineAccountId, 'broadcast-updated', { broadcastId: broadcast.id })

    if (shouldSchedule) {
      scheduleDelivery(broadcast.id, scheduledAt!)
    } else if (sendNow) {
      // Run async after responding.
      setTimeout(() => enqueueBroadcast(broadcast.id, deliverBroadcast), 0)
    }

    return successResponse({ broadcast }, 201)
  } catch (error) {
    console.error('Error creating broadcast:', error)
    return errorResponse('Failed to create broadcast', 500)
  }
})
