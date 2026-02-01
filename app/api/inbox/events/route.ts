import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { addSseClient, removeSseClient } from '@/lib/sse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const lineAccountId = session.user.lineAccountId
  let keepAlive: ReturnType<typeof setInterval> | null = null
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller
      addSseClient(lineAccountId, controller)

      controller.enqueue(
        new TextEncoder().encode(
          `event: connected\ndata: ${JSON.stringify({ lineAccountId })}\n\n`
        )
      )

      keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: ping\ndata: ${Date.now()}\n\n`))
        } catch {
          // Ignore keep-alive errors.
        }
      }, 25000)

      request.signal.addEventListener('abort', () => {
        if (keepAlive) clearInterval(keepAlive)
        keepAlive = null
        if (controllerRef) {
          removeSseClient(lineAccountId, controllerRef)
        }
      })
    },
    cancel() {
      if (keepAlive) clearInterval(keepAlive)
      keepAlive = null
      if (controllerRef) {
        removeSseClient(lineAccountId, controllerRef)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
