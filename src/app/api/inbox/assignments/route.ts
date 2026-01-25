import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { broadcastRealtimeEvent } from '@/lib/realtime'

function isPrivileged(role?: string | null) {
  return role === 'super_admin' || role === 'admin'
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPrivileged(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, adminId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const parsedUserId = Number(userId)
    if (!Number.isFinite(parsedUserId)) {
      return NextResponse.json({ error: 'userId must be a number' }, { status: 400 })
    }

    const sessionAdminId = Number(session.user.id)
    if (!Number.isFinite(sessionAdminId)) {
      return NextResponse.json({ error: 'Invalid session admin id' }, { status: 400 })
    }

    const targetAdminId = adminId !== undefined && adminId !== null ? Number(adminId) : sessionAdminId
    if (!Number.isFinite(targetAdminId)) {
      return NextResponse.json({ error: 'adminId must be a number' }, { status: 400 })
    }

    const assignment = await prisma.conversationAssignee.upsert({
      where: {
        userId_adminId: { userId: parsedUserId, adminId: targetAdminId },
      },
      create: {
        userId: parsedUserId,
        adminId: targetAdminId,
        assignedBy: sessionAdminId,
        status: 'active',
      },
      update: {
        status: 'active',
        assignedBy: sessionAdminId,
      },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    })

    broadcastRealtimeEvent({
      type: 'assignment_change',
      data: {
        conversationId: parsedUserId.toString(),
        action: 'assign',
        admin: assignment.admin,
      },
      timestamp: Date.now(),
    })

    return NextResponse.json({
      data: {
        id: assignment.id.toString(),
        userId: assignment.userId.toString(),
        adminId: assignment.adminId.toString(),
        status: assignment.status,
        admin: {
          ...assignment.admin,
          id: assignment.admin.id.toString(),
        },
      },
    })
  } catch (error) {
    console.error('Error assigning conversation:', error)
    return NextResponse.json(
      { error: 'Failed to assign conversation' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPrivileged(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)
    const userId = body.userId || searchParams.get('userId')
    const adminId = body.adminId || searchParams.get('adminId')

    if (!userId || !adminId) {
      return NextResponse.json(
        { error: 'userId and adminId are required' },
        { status: 400 }
      )
    }

    const parsedUserId = Number(userId)
    const parsedAdminId = Number(adminId)
    if (!Number.isFinite(parsedUserId) || !Number.isFinite(parsedAdminId)) {
      return NextResponse.json(
        { error: 'userId and adminId must be numbers' },
        { status: 400 }
      )
    }

    await prisma.conversationAssignee.deleteMany({
      where: { userId: parsedUserId, adminId: parsedAdminId },
    })

    broadcastRealtimeEvent({
      type: 'assignment_change',
      data: {
        conversationId: parsedUserId.toString(),
        action: 'unassign',
        adminId: parsedAdminId.toString(),
      },
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unassigning conversation:', error)
    return NextResponse.json(
      { error: 'Failed to unassign conversation' },
      { status: 500 }
    )
  }
}
