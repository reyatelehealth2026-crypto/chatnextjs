import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { withPermission } from '@/lib/api-helpers'
import { csvEscape } from '@/lib/csv'
import { createExportJob } from '@/lib/export-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseList(searchParams: URLSearchParams, key: string) {
  const direct = searchParams.get(key)
  if (direct) {
    return direct
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return searchParams.getAll(key).map((s) => s.trim()).filter(Boolean)
}

/**
 * GET /api/inbox/conversations/export
 *
 * Query:
 * - conversationIds=... (comma-separated) OR conversationIds=...&conversationIds=...
 * - status=OPEN|PENDING|RESOLVED|CLOSED (optional)
 */
export const GET = withPermission('exportData', async (user, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const conversationIds = parseList(searchParams, 'conversationIds')
  const status = searchParams.get('status')?.toUpperCase() ?? null
  const asyncMode = searchParams.get('async') === '1'

  const where: any = { lineAccountId: user.lineAccountId }
  if (conversationIds.length > 0) where.id = { in: conversationIds }
  if (status && ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].includes(status)) where.status = status

  // Safety guard: avoid exporting an unbounded tenant dataset by accident.
  if (!where.id && !where.status) {
    return new Response('Bad Request: conversationIds or status is required', { status: 400 })
  }

  const filename = `conversations-${user.lineAccountId}.csv`

  const build = async () => {
    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        customer: { select: { id: true, displayName: true, lineUserId: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            direction: true,
            messageType: true,
            content: true,
            createdAt: true,
          },
        },
      },
    })

    const header = [
      'conversationId',
      'customerId',
      'customerDisplayName',
      'customerLineUserId',
      'messageId',
      'direction',
      'messageType',
      'content',
      'createdAt',
    ]

    const rows: string[][] = []
    for (const c of conversations) {
      if (c.messages.length === 0) {
        rows.push([
          c.id,
          c.customer.id,
          c.customer.displayName,
          c.customer.lineUserId,
          '',
          '',
          '',
          '',
          '',
        ])
        continue
      }
      for (const m of c.messages) {
        rows.push([
          c.id,
          c.customer.id,
          c.customer.displayName,
          c.customer.lineUserId,
          m.id,
          m.direction,
          m.messageType,
          m.content,
          m.createdAt.toISOString(),
        ])
      }
    }
    return header.join(',') + '\n' + rows.map((r) => r.map(csvEscape).join(',')).join('\n') + '\n'
  }

  if (asyncMode) {
    const jobId = createExportJob({
      filename,
      build,
      ownerLineAccountId: user.lineAccountId,
      ownerUserId: user.id,
    })
    return new Response(
      JSON.stringify({
        success: true,
        data: { jobId, statusUrl: `/api/inbox/exports/${jobId}` },
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const csv = await build()
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"${filename}\"`,
      'X-Export-Generated-At': new Date().toISOString(),
      'X-Line-Account-Id': user.lineAccountId,
    },
  })
})
