import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { withPermission } from '@/lib/api-helpers'
import { csvEscape } from '@/lib/csv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/inbox/customers/export
 */
export const GET = withPermission('exportData', async (user, _request: NextRequest) => {
  const [fields, customers] = await Promise.all([
    prisma.customField.findMany({
      where: { lineAccountId: user.lineAccountId },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { lineAccountId: user.lineAccountId },
      orderBy: { createdAt: 'desc' },
      include: { customFieldValues: true },
    }),
  ])

  const fieldColumns = fields.map((f) => f.name)
  const header = [
    'customerId',
    'displayName',
    'lineUserId',
    'statusMessage',
    'isBlocked',
    'lastContactAt',
    'createdAt',
    ...fieldColumns,
  ]

  const rows = customers.map((c) => {
    const valuesByField = new Map<string, string>()
    for (const v of c.customFieldValues) valuesByField.set(v.customFieldId, v.value)
    return [
      c.id,
      c.displayName,
      c.lineUserId,
      c.statusMessage ?? '',
      c.isBlocked ? 'true' : 'false',
      c.lastContactAt?.toISOString() ?? '',
      c.createdAt.toISOString(),
      ...fields.map((f) => valuesByField.get(f.id) ?? ''),
    ]
  })

  const csv = header.join(',') + '\n' + rows.map((r) => r.map(csvEscape).join(',')).join('\n') + '\n'

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"customers-${user.lineAccountId}.csv\"`,
      'X-Export-Generated-At': new Date().toISOString(),
      'X-Line-Account-Id': user.lineAccountId,
    },
  })
})
