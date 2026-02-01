'use client'

import { useState, useEffect } from 'react'
import { useOffline } from '@/components/providers/offline-provider'

export function OfflineBanner() {
  const { online } = useOffline()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  if (online) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-sm text-center" role="status" aria-live="polite">
      Offline mode: actions will be queued and synced automatically.
    </div>
  )
}
