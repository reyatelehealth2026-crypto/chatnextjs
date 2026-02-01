import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = ['/auth/signin', '/auth/error', '/api/auth', '/api/webhook']

const CSRF_COOKIE = 'csrf-token'
const CSRF_HEADER = 'x-csrf-token'

function needsCsrf(pathname: string, method: string) {
  if (!pathname.startsWith('/api/inbox')) return false
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false
  return true
}

function ensureCsrfCookie(req: NextRequest, res: NextResponse) {
  const existing = req.cookies.get(CSRF_COOKIE)?.value
  if (existing) return existing
  const token = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
  res.cookies.set({
    name: CSRF_COOKIE,
    value: token,
    httpOnly: false,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    path: '/',
  })
  return token
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const res = NextResponse.next()
    ensureCsrfCookie(req, res)
    return res
  }

  // CSRF protection for API mutations under /api/inbox
  if (needsCsrf(pathname, req.method)) {
    const cookieToken = req.cookies.get(CSRF_COOKIE)?.value
    const headerToken = req.headers.get(CSRF_HEADER)
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'CSRF token invalid', code: 'FORBIDDEN' },
        },
        { status: 403 }
      )
    }
  }

  const res = NextResponse.next()
  ensureCsrfCookie(req, res)
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
