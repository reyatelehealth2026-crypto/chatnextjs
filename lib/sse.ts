import { TextEncoder } from 'util'

const encoder = new TextEncoder()
const clients = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>()

function formatSse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function addSseClient(
  lineAccountId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
) {
  const existing = clients.get(lineAccountId)
  if (existing) {
    existing.add(controller)
    return
  }
  clients.set(lineAccountId, new Set([controller]))
}

export function removeSseClient(
  lineAccountId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
) {
  const existing = clients.get(lineAccountId)
  if (!existing) return
  existing.delete(controller)
  if (existing.size === 0) {
    clients.delete(lineAccountId)
  }
}

export function sendSseEvent(lineAccountId: string, event: string, data: unknown) {
  const existing = clients.get(lineAccountId)
  if (!existing) return
  const payload = formatSse(event, data)
  for (const controller of existing) {
    try {
      controller.enqueue(payload)
    } catch {
      // Ignore stale connections.
    }
  }
}

export function broadcastSseEvent(event: string, data: unknown) {
  const payload = formatSse(event, data)
  for (const existing of clients.values()) {
    for (const controller of existing) {
      try {
        controller.enqueue(payload)
      } catch {
        // Ignore stale connections.
      }
    }
  }
}