'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type OfflineContextType = {
  online: boolean
  queue: any[]
  enqueue: (action: any) => void
  flush: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextType | null>(null)

function loadQueue(): any[] {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('offline-queue') || '[]') ?? []
  } catch {
    return []
  }
}

function saveQueue(queue: any[]) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem('offline-queue', JSON.stringify(queue))
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [queue, setQueue] = useState<any[]>(() => loadQueue())

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    saveQueue(queue)
  }, [queue])

  const flush = async () => {
    for (const action of queue) {
      try {
        await fetch(action.url, {
          method: action.method || 'POST',
          headers: action.headers,
          body: action.body ? JSON.stringify(action.body) : undefined,
        })
      } catch {
        // keep in queue if fails
        return
      }
    }
    setQueue([])
  }

  useEffect(() => {
    if (online && queue.length > 0) {
      void flush()
    }
  }, [online])

  const value = useMemo<OfflineContextType>(
    () => ({
      online,
      queue,
      enqueue(action) {
        setQueue((prev) => [...prev, action])
      },
      flush,
    }),
    [online, queue]
  )

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider')
  return ctx
}

