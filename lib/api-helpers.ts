import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, requirePermission, requireRole, type Permission, type UserRole } from '@/lib/permissions'
import { checkRateLimit } from '@/lib/rate-limit'
import { refreshDatabaseSessionFromRequest } from '@/lib/session'

/**
 * Error response helper
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST',
      },
    },
    { status }
  )
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

/**
 * Wrapper for API routes that require authentication
 */
export function withAuth<T extends any[]>(
  handler: (user: Awaited<ReturnType<typeof requireAuth>>, ...args: T) => Promise<Response>
) {
  return async (...args: T) => {
    try {
      const user = await requireAuth()

      // App Router route handlers pass `NextRequest` as the first arg after `user`.
      const req = (args[0] as any) as NextRequest | undefined
      if (req) {
        const rl = checkRateLimit({
          request: req,
          userId: user.id,
          lineAccountId: user.lineAccountId,
          mode: 'consume',
        })
        if (!rl.enforced.ok) {
          const res = errorResponse('Rate limit exceeded', 429)
          res.headers.set('X-RateLimit-Limit', String(rl.enforced.limit))
          res.headers.set('X-RateLimit-Remaining', String(rl.enforced.remaining))
          res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.enforced.resetAt / 1000)))
          return res
        }

        // Best-effort DB session refresh on activity.
        await refreshDatabaseSessionFromRequest({
          request: req,
          maxAgeSeconds: 8 * 60 * 60,
          updateAgeSeconds: 15 * 60,
        }).catch(() => undefined)

        const res = await handler(user, ...args)
        res.headers.set('X-RateLimit-Limit', String(rl.enforced.limit))
        res.headers.set('X-RateLimit-Remaining', String(rl.enforced.remaining))
        res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.enforced.resetAt / 1000)))
        return res
      }

      return await handler(user, ...args)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return errorResponse('Authentication required', 401)
      }
      console.error('API Error:', error)
      return errorResponse('Internal server error', 500)
    }
  }
}

/**
 * Wrapper for API routes that require specific permission
 */
export function withPermission<T extends any[]>(
  permission: Permission,
  handler: (user: Awaited<ReturnType<typeof requireAuth>>, ...args: T) => Promise<Response>
) {
  return async (...args: T) => {
    try {
      const user = await requirePermission(permission)

      const req = (args[0] as any) as NextRequest | undefined
      if (req) {
        const rl = checkRateLimit({
          request: req,
          userId: user.id,
          lineAccountId: user.lineAccountId,
          mode: 'consume',
        })
        if (!rl.enforced.ok) {
          const res = errorResponse('Rate limit exceeded', 429)
          res.headers.set('X-RateLimit-Limit', String(rl.enforced.limit))
          res.headers.set('X-RateLimit-Remaining', String(rl.enforced.remaining))
          res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.enforced.resetAt / 1000)))
          return res
        }

        await refreshDatabaseSessionFromRequest({
          request: req,
          maxAgeSeconds: 8 * 60 * 60,
          updateAgeSeconds: 15 * 60,
        }).catch(() => undefined)

        const res = await handler(user, ...args)
        res.headers.set('X-RateLimit-Limit', String(rl.enforced.limit))
        res.headers.set('X-RateLimit-Remaining', String(rl.enforced.remaining))
        res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.enforced.resetAt / 1000)))
        return res
      }

      return await handler(user, ...args)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return errorResponse('Authentication required', 401)
        }
        if (error.message.startsWith('Forbidden')) {
          return errorResponse('Insufficient permissions', 403)
        }
      }
      console.error('API Error:', error)
      return errorResponse('Internal server error', 500)
    }
  }
}

/**
 * Wrapper for API routes that require specific role
 */
export function withRole<T extends any[]>(
  roles: UserRole[],
  handler: (user: Awaited<ReturnType<typeof requireAuth>>, ...args: T) => Promise<Response>
) {
  return async (...args: T) => {
    try {
      const user = await requireRole(roles)

      const req = (args[0] as any) as NextRequest | undefined
      if (req) {
        const rl = checkRateLimit({
          request: req,
          userId: user.id,
          lineAccountId: user.lineAccountId,
          mode: 'consume',
        })
        if (!rl.enforced.ok) {
          const res = errorResponse('Rate limit exceeded', 429)
          res.headers.set('X-RateLimit-Limit', String(rl.enforced.limit))
          res.headers.set('X-RateLimit-Remaining', String(rl.enforced.remaining))
          res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.enforced.resetAt / 1000)))
          return res
        }

        await refreshDatabaseSessionFromRequest({
          request: req,
          maxAgeSeconds: 8 * 60 * 60,
          updateAgeSeconds: 15 * 60,
        }).catch(() => undefined)

        const res = await handler(user, ...args)
        res.headers.set('X-RateLimit-Limit', String(rl.enforced.limit))
        res.headers.set('X-RateLimit-Remaining', String(rl.enforced.remaining))
        res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.enforced.resetAt / 1000)))
        return res
      }

      return await handler(user, ...args)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return errorResponse('Authentication required', 401)
        }
        if (error.message.startsWith('Forbidden')) {
          return errorResponse('Insufficient role', 403)
        }
      }
      console.error('API Error:', error)
      return errorResponse('Internal server error', 500)
    }
  }
}

/**
 * Validate line account ownership
 * Ensures the user can only access data from their own line account
 */
export function validateLineAccountOwnership(
  userLineAccountId: string,
  resourceLineAccountId: string
) {
  if (userLineAccountId !== resourceLineAccountId) {
    throw new Error('Forbidden: Cross-tenant access denied')
  }
}
