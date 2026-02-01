import prisma from '@/lib/prisma'
import { withPermission } from '@/lib/api-helpers'
import { csvEscape } from '@/lib/csv'

/**
 * GET /api/inbox/analytics/export
 *
 * Requirements: 14.8
 */
export const GET = withPermission('exportData', async (user) => {
  const [customers, conversations, messages] = await Promise.all([
    prisma.customer.count({ where: { lineAccountId: user.lineAccountId } }),
    prisma.conversation.groupBy({
      by: ['status'],
      where: { lineAccountId: user.lineAccountId },
      _count: { _all: true },
    }),
    prisma.message.count({ where: { conversation: { lineAccountId: user.lineAccountId } } }),
  ])

  const rows = [
    ['metric', 'value'],
    ['customers.total', customers],
    ['messages.total', messages],
    ...conversations.map((c) => [`conversations.status.${c.status}`, c._count._all]),
  ]

  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n') + '\n'

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"analytics-${user.lineAccountId}.csv\"`,
      'X-Export-Generated-At': new Date().toISOString(),
      'X-Line-Account-Id': user.lineAccountId,
    },
  })
})
