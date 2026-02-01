'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const routesToPrefetch = ['/inbox', '/inbox/analytics', '/inbox/templates', '/inbox/customers']

export function PerformancePrefetch() {
  const router = useRouter()
  useEffect(() => {
    routesToPrefetch.forEach((route) => router.prefetch(route))
  }, [router])
  return null
}

