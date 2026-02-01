import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/permissions'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/inbox/rate-limit
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const rl = checkRateLimit({
      request,
      userId: user.id,
      lineAccountId: user.lineAccountId,
      mode: 'peek',
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          perSession: rl.perSession,
          perAccount: rl.perAccount,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }
    console.error('Error fetching rate limit status:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

