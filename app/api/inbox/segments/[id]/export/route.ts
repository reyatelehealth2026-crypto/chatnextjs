import prisma from '@/lib/prisma'
import { withPermission } from '@/lib/api-helpers'
import { csvEscape } from '@/lib/csv'

/**
 * GET /api/inbox/segments/[id]/export
 *
 * Requirements: 13.4
 */
export const GET = withPermission(
  'exportData',
  async (user, _request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const segment = await prisma.segment.findUnique({
      where: { id, lineAccountId: user.lineAccountId },
      select: { id: true, name: true },
    })
    if (!segment) {
      return new Response('Not Found', { status: 404 })
    }

    const members = await prisma.segmentMember.findMany({
      where: { segmentId: segment.id, customer: { lineAccountId: user.lineAccountId } },
      include: { customer: true },
      orderBy: { addedAt: 'desc' },
    })

    const header = ['customerId', 'displayName', 'lineUserId', 'statusMessage', 'isBlocked', 'lastContactAt']
    const rows = members.map((m) => [
      m.customer.id,
      m.customer.displayName,
      m.customer.lineUserId,
      m.customer.statusMessage ?? '',
      m.customer.isBlocked ? 'true' : 'false',
      m.customer.lastContactAt?.toISOString() ?? '',
    ])

    const csv =
      header.join(',') +
      '\n' +
      rows.map((r) => r.map(csvEscape).join(',')).join('\n') +
      '\n'

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"segment-${segment.id}.csv\"`,
        'X-Export-Generated-At': new Date().toISOString(),
        'X-Line-Account-Id': user.lineAccountId,
      },
    })
  }
)
