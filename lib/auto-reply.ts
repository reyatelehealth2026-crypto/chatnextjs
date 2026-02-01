import prisma from '@/lib/prisma'

export type AutoReplyMatch = {
  ruleId: string
  responseContent: string
}

export async function findAutoReply(params: {
  lineAccountId: string
  messageText: string
}) : Promise<AutoReplyMatch | null> {
  const text = params.messageText.trim()
  if (!text) return null

  const rules = await prisma.autoReplyRule.findMany({
    where: {
      lineAccountId: params.lineAccountId,
      isEnabled: true,
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      triggerType: true,
      triggerValue: true,
      responseContent: true,
    },
  })

  const lower = text.toLowerCase()

  for (const rule of rules) {
    if (rule.triggerType === 'KEYWORD_EXACT') {
      if (lower === rule.triggerValue.toLowerCase()) {
        return { ruleId: rule.id, responseContent: rule.responseContent }
      }
    }
    if (rule.triggerType === 'KEYWORD_CONTAINS') {
      if (lower.includes(rule.triggerValue.toLowerCase())) {
        return { ruleId: rule.id, responseContent: rule.responseContent }
      }
    }
  }

  return null
}

