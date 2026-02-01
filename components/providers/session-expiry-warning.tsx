'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

export function SessionExpiryWarning() {
  const { data: session } = useSession()
  const lastNotifiedAt = useRef<number>(0)

  useEffect(() => {
    const expiresAt = session?.expires ? new Date(session.expires).getTime() : null
    if (!expiresAt || Number.isNaN(expiresAt)) return

    const id = window.setInterval(() => {
      const msLeft = expiresAt - Date.now()
      const warnAtMs = 5 * 60 * 1000
      if (msLeft > warnAtMs) return

      const now = Date.now()
      if (now - lastNotifiedAt.current < 60_000) return
      lastNotifiedAt.current = now

      const minutes = Math.max(0, Math.ceil(msLeft / 60_000))
      toast.warning(`Session expires in ${minutes} minute${minutes === 1 ? '' : 's'}.`)
    }, 30_000)

    return () => window.clearInterval(id)
  }, [session?.expires])

  return null
}

