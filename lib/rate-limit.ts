import type { NextRequest } from 'next/server'
import { env } from './env'

type WindowEntry = {
  resetAt: number
  count: number
}

type RateLimitResult = {
  ok: true
  limit: number
  remaining: number
  resetAt: number
} | {
  ok: false
  limit: number
  remaining: number
  resetAt: number
}

const store = new Map<string, WindowEntry>()

// Cleanup expired entries every minute to prevent memory leak
const CLEANUP_INTERVAL_MS = 60_000
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

function nowMs() {
  return Date.now()
}

function getCookieValue(request: NextRequest, name: string) {
  try {
    return request.cookies.get(name)?.value ?? null
  } catch {
    return null
  }
}

function getSessionKey(request: NextRequest) {
  return (
    getCookieValue(request, 'authjs.session-token') ??
    getCookieValue(request, '__Secure-authjs.session-token') ??
    getCookieValue(request, 'next-auth.session-token') ??
    getCookieValue(request, '__Secure-next-auth.session-token') ??
    null
  )
}

function getClientIp(request: NextRequest) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || null
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return null
}

function ensureWindow(key: string, windowMs: number) {
  const now = nowMs()
  const existing = store.get(key)
  if (!existing || existing.resetAt <= now) {
    const next: WindowEntry = { resetAt: now + windowMs, count: 0 }
    store.set(key, next)
    return next
  }
  return existing
}

function peekFixedWindow(key: string, limit: number, windowMs: number): RateLimitResult {
  const window = ensureWindow(key, windowMs)
  const remaining = Math.max(0, limit - window.count)
  const ok = window.count <= limit
  return { ok: ok as any, limit, remaining, resetAt: window.resetAt }
}

function consumeFixedWindow(key: string, limit: number, windowMs: number): RateLimitResult {
  const window = ensureWindow(key, windowMs)
  window.count += 1
  store.set(key, window)

  const remaining = Math.max(0, limit - window.count)
  const ok = window.count <= limit
  return { ok: ok as any, limit, remaining, resetAt: window.resetAt }
}

export function checkRateLimit(params: {
  request: NextRequest
  userId?: string | null
  lineAccountId?: string | null
  mode?: 'consume' | 'peek'
}) {
  const sessionKey = getSessionKey(params.request)
  const ip = getClientIp(params.request)

  const sessionId =
    sessionKey ? `sess:${sessionKey}` : params.userId ? `user:${params.userId}` : ip ? `ip:${ip}` : 'anon'

  const accountId = params.lineAccountId ? `acct:${params.lineAccountId}` : 'acct:anon'

  const sessionLimit = env.RATE_LIMIT_PER_SESSION
  const accountLimit = env.RATE_LIMIT_PER_ACCOUNT
  const windowMs = env.RATE_LIMIT_WINDOW_MS

  const fn = params.mode === 'peek' ? peekFixedWindow : consumeFixedWindow
  const perSession = fn(`rate:${sessionId}`, sessionLimit, windowMs)
  const perAccount = fn(`rate:${accountId}`, accountLimit, windowMs)

  // Enforce whichever is more restrictive right now.
  const enforced = !perSession.ok ? perSession : !perAccount.ok ? perAccount : perSession.remaining < perAccount.remaining ? perSession : perAccount
  return { perSession, perAccount, enforced }
}
