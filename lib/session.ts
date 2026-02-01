import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

function getCookieValue(request: NextRequest, name: string) {
  try {
    return request.cookies.get(name)?.value ?? null
  } catch {
    return null
  }
}

export function getSessionTokenFromRequest(request: NextRequest) {
  return (
    getCookieValue(request, 'authjs.session-token') ??
    getCookieValue(request, '__Secure-authjs.session-token') ??
    getCookieValue(request, 'next-auth.session-token') ??
    getCookieValue(request, '__Secure-next-auth.session-token') ??
    null
  )
}

export async function refreshDatabaseSessionFromRequest(params: {
  request: NextRequest
  maxAgeSeconds: number
  updateAgeSeconds: number
}) {
  const token = getSessionTokenFromRequest(params.request)
  if (!token) return

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: { expires: true },
  })
  if (!session) return

  const now = Date.now()
  const expiresMs = session.expires.getTime()
  const refreshWindowMs = params.updateAgeSeconds * 1000
  if (expiresMs - now > refreshWindowMs) return

  const nextExpires = new Date(now + params.maxAgeSeconds * 1000)
  await prisma.session.update({
    where: { sessionToken: token },
    data: { expires: nextExpires },
  })
}

