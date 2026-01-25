import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateAiText } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const rawUserId = body.userId
    const userId = rawUserId ? Number(rawUserId) : undefined
    const tone = (body.tone as string | undefined) || 'friendly'

    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 })
    }

    const user = await prisma.lineUser.findFirst({
      where: {
        id: userId,
        ...(session.user.role !== 'super_admin' && session.user.lineAccountId
          ? { lineAccountId: session.user.lineAccountId }
          : {}),
      },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })

    const history = messages
      .slice()
      .reverse()
      .map((msg) => {
        const role = msg.direction === 'incoming' ? 'Customer' : 'Agent'
        const content = msg.content || `[${msg.messageType}]`
        return `${role}: ${content}`
      })
      .join('\n')

    const prompt = `You are a pharmacy customer support assistant. Write a concise reply in Thai with a ${tone} tone. Keep it helpful and safe.

Conversation:
${history}

Reply:`

    const text = await generateAiText({
      parts: [{ text: prompt }],
      systemPrompt: 'Be concise, polite, and accurate.',
      maxTokens: 400,
    })

    return NextResponse.json({ text })
  } catch (error) {
    console.error('AI reply error:', error)
    return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 })
  }
}
