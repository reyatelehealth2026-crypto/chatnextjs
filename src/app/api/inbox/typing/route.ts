import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { broadcastRealtimeEvent } from '@/lib/realtime'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, isTyping } = body

    if (!conversationId || typeof isTyping !== 'boolean') {
      return NextResponse.json(
        { error: 'conversationId and isTyping are required' },
        { status: 400 }
      )
    }

    broadcastRealtimeEvent({
      type: 'typing',
      data: {
        conversationId,
        userId: session.user.id,
        userName: session.user.name || session.user.email,
        isTyping,
      },
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending typing indicator:', error)
    return NextResponse.json(
      { error: 'Failed to send typing indicator' },
      { status: 500 }
    )
  }
}
