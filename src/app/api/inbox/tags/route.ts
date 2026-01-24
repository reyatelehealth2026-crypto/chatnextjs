import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get all tags
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tags = await prisma.userTag.findMany({
      where: session.user.lineAccountId
        ? { lineAccountId: session.user.lineAccountId }
        : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    })

    return NextResponse.json({
      data: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        isAuto: tag.isAuto,
        sortOrder: tag.sortOrder,
        usageCount: tag._count.assignments,
      })),
    })
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

// Create a new tag
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color = '#3B82F6', description } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const tag = await prisma.userTag.create({
      data: {
        name,
        color,
        description,
        lineAccountId: session.user.lineAccountId,
      },
    })

    return NextResponse.json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      isAuto: tag.isAuto,
      sortOrder: tag.sortOrder,
    })
  } catch (error) {
    console.error('Error creating tag:', error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}

// Assign/remove tag from user
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, tagId, action } = body

    if (!userId || !tagId || !action) {
      return NextResponse.json(
        { error: 'userId, tagId, and action are required' },
        { status: 400 }
      )
    }

    if (action === 'assign') {
      await prisma.userTagAssignment.upsert({
        where: {
          userId_tagId: { userId, tagId },
        },
        create: {
          userId,
          tagId,
          assignedBy: session.user.id,
          isAuto: false,
        },
        update: {},
      })
    } else if (action === 'remove') {
      await prisma.userTagAssignment.deleteMany({
        where: { userId, tagId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating tag assignment:', error)
    return NextResponse.json(
      { error: 'Failed to update tag assignment' },
      { status: 500 }
    )
  }
}

// Delete a tag
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')

    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
    }

    await prisma.userTag.delete({
      where: { id: tagId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
