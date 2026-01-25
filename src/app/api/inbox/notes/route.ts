import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get notes for a user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const parsedUserId = Number(userId)
    if (!Number.isFinite(parsedUserId)) {
      return NextResponse.json({ error: 'userId must be a number' }, { status: 400 })
    }

    const notes = await prisma.customerNote.findMany({
      where: { userId: parsedUserId },
      include: {
        admin: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      data: notes.map((note) => ({
        id: note.id.toString(),
        userId: note.userId.toString(),
        adminId: note.adminId.toString(),
        content: note.content,
        isPinned: note.isPinned,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        admin: note.admin
          ? {
              id: note.admin.id.toString(),
              displayName: note.admin.displayName,
              avatarUrl: note.admin.avatarUrl,
            }
          : undefined,
      })),
    })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// Create a new note
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, content, isPinned = false } = body

    if (!userId || !content) {
      return NextResponse.json({ error: 'userId and content are required' }, { status: 400 })
    }

    const parsedUserId = Number(userId)
    const parsedAdminId = Number(session.user.id)
    if (!Number.isFinite(parsedUserId) || !Number.isFinite(parsedAdminId)) {
      return NextResponse.json(
        { error: 'userId and adminId must be numbers' },
        { status: 400 }
      )
    }

    const note = await prisma.customerNote.create({
      data: {
        userId: parsedUserId,
        adminId: parsedAdminId,
        content,
        isPinned,
      },
      include: {
        admin: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: note.id.toString(),
      userId: note.userId.toString(),
      adminId: note.adminId.toString(),
      content: note.content,
      isPinned: note.isPinned,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      admin: note.admin
        ? {
            id: note.admin.id.toString(),
            displayName: note.admin.displayName,
            avatarUrl: note.admin.avatarUrl,
          }
        : undefined,
    })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}

// Update a note
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, content, isPinned } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const parsedId = Number(id)
    if (!Number.isFinite(parsedId)) {
      return NextResponse.json({ error: 'id must be a number' }, { status: 400 })
    }

    const note = await prisma.customerNote.update({
      where: { id: parsedId },
      data: {
        content,
        isPinned,
      },
      include: {
        admin: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: note.id.toString(),
      userId: note.userId.toString(),
      adminId: note.adminId.toString(),
      content: note.content,
      isPinned: note.isPinned,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      admin: note.admin
        ? {
            id: note.admin.id.toString(),
            displayName: note.admin.displayName,
            avatarUrl: note.admin.avatarUrl,
          }
        : undefined,
    })
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// Delete a note
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const parsedId = Number(id)
    if (!Number.isFinite(parsedId)) {
      return NextResponse.json({ error: 'id must be a number' }, { status: 400 })
    }

    await prisma.customerNote.delete({
      where: { id: parsedId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
