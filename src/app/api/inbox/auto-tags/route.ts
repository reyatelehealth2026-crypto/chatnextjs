import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get all auto-tag rules
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rules = await prisma.autoTagRule.findMany({
      where: session.user.lineAccountId
        ? {
            tag: {
              lineAccountId: session.user.lineAccountId,
            },
          }
        : {},
      include: {
        tag: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      data: rules.map((rule) => ({
        id: rule.id,
        tagId: rule.tagId,
        triggerType: rule.triggerType,
        conditions: JSON.parse(rule.conditions),
        isActive: rule.isActive,
        priority: rule.priority,
        tag: {
          id: rule.tag.id,
          name: rule.tag.name,
          color: rule.tag.color,
        },
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching auto-tag rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch auto-tag rules' },
      { status: 500 }
    )
  }
}

// Create a new auto-tag rule
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { tagId, triggerType, conditions, priority = 0 } = body

    if (!tagId || !triggerType) {
      return NextResponse.json(
        { error: 'tagId and triggerType are required' },
        { status: 400 }
      )
    }

    const rule = await prisma.autoTagRule.create({
      data: {
        tagId,
        triggerType,
        conditions: JSON.stringify(conditions || []),
        priority,
        isActive: true,
      },
      include: {
        tag: true,
      },
    })

    return NextResponse.json({
      id: rule.id,
      tagId: rule.tagId,
      triggerType: rule.triggerType,
      conditions: JSON.parse(rule.conditions),
      isActive: rule.isActive,
      priority: rule.priority,
      tag: {
        id: rule.tag.id,
        name: rule.tag.name,
        color: rule.tag.color,
      },
    })
  } catch (error) {
    console.error('Error creating auto-tag rule:', error)
    return NextResponse.json(
      { error: 'Failed to create auto-tag rule' },
      { status: 500 }
    )
  }
}

// Update an auto-tag rule
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, conditions, isActive, priority } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const rule = await prisma.autoTagRule.update({
      where: { id },
      data: {
        ...(conditions !== undefined && { conditions: JSON.stringify(conditions) }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority }),
      },
      include: {
        tag: true,
      },
    })

    return NextResponse.json({
      id: rule.id,
      tagId: rule.tagId,
      triggerType: rule.triggerType,
      conditions: JSON.parse(rule.conditions),
      isActive: rule.isActive,
      priority: rule.priority,
      tag: {
        id: rule.tag.id,
        name: rule.tag.name,
        color: rule.tag.color,
      },
    })
  } catch (error) {
    console.error('Error updating auto-tag rule:', error)
    return NextResponse.json(
      { error: 'Failed to update auto-tag rule' },
      { status: 500 }
    )
  }
}

// Delete an auto-tag rule
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.autoTagRule.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting auto-tag rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete auto-tag rule' },
      { status: 500 }
    )
  }
}
