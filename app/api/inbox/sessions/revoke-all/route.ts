import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/inbox/sessions/revoke-all
 *
 * Deletes all DB sessions for the current user (logout everywhere).
 */
export async function POST(_request: NextRequest) {
  try {
    const user = await requireAuth()
    await prisma.session.deleteMany({ where: { userId: user.id } })
    return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }
    console.error('Error revoking sessions:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

