import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// SSE endpoint for real-time updates
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
      }, 30000) // Send ping every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval)
        controller.close()
      })
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
