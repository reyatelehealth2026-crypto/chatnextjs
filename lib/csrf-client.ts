'use client'

export function getCsrfToken() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

