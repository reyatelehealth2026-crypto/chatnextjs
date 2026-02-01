const queue: string[] = []
let running = false

export function enqueueBroadcast(broadcastId: string, worker: (id: string) => Promise<void>) {
  queue.push(broadcastId)
  if (running) return
  running = true

  const run = async () => {
    while (queue.length) {
      const id = queue.shift()!
      try {
        await worker(id)
      } catch {
        // Worker should handle its own error state; keep the queue moving.
      }
    }
    running = false
  }

  void run()
}

