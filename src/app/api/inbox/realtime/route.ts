import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// SSE endpoint for real-time updates
export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
        userId: session.user.id,
      })
      controller.enqueue(encoder.encode(`data: ${data}\n\n`))

      // Keep-alive interval
      const keepAliveInterval = setInterval(() => {
        try {
          const keepAlive = JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
          })
          controller.enqueue(encoder.encode(`data: ${keepAlive}\n\n`))
        } catch {
          clearInterval(keepAliveInterval)
        }
      }, 25000) // Send ping every 25 seconds (before 30s timeout)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval)
        controller.close()
      })

      // Close after 4 minutes to prevent timeout
      setTimeout(() => {
        clearInterval(keepAliveInterval)
        controller.close()
      }, 240000) // 4 minutes
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
