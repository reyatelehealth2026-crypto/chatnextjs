import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

/**
 * GET /api/inbox/templates
 * POST /api/inbox/templates
 *
 * Requirements: 9.1, 9.2, 9.8
 */
export const GET = withPermission('viewTemplates', async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const shortcut = searchParams.get('shortcut')?.trim() || ''

    const where: any = { lineAccountId: user.lineAccountId }
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (shortcut) {
      where.shortcuts = { has: shortcut }
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        category: true,
        shortcuts: true,
        variables: true,
        usageCount: true,
        updatedAt: true,
      },
    })

    return successResponse({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return errorResponse('Failed to fetch templates', 500)
  }
})

export const POST = withPermission('manageTemplates', async (user, request: NextRequest) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          title?: unknown
          content?: unknown
          category?: unknown
          shortcuts?: unknown
          variables?: unknown
        }
      | null

    const title = sanitizeText(body?.title, { maxLen: 120 })
    const content = sanitizeText(body?.content, { maxLen: 5000 })
    const categoryRaw = sanitizeText(body?.category, { maxLen: 120 })
    const category = categoryRaw ? categoryRaw : null
    const shortcuts = Array.isArray(body?.shortcuts)
      ? body!.shortcuts
          .filter((s) => typeof s === 'string' && s.trim())
          .map((s) => sanitizeText(s, { maxLen: 64 }))
          .filter(Boolean)
      : []
    const variables = Array.isArray(body?.variables)
      ? body!.variables
          .filter((s) => typeof s === 'string' && s.trim())
          .map((s) => sanitizeText(s, { maxLen: 64 }))
          .filter(Boolean)
      : []

    if (!title || !content) return errorResponse('title and content are required', 400)

    const template = await prisma.template.create({
      data: {
        lineAccountId: user.lineAccountId,
        title,
        content,
        category: category || undefined,
        shortcuts,
        variables,
        createdBy: user.id,
      },
      select: { id: true },
    })

    return successResponse({ template }, 201)
  } catch (error) {
    console.error('Error creating template:', error)
    return errorResponse('Failed to create template', 500)
  }
})
