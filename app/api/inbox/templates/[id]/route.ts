import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

export const GET = withPermission(
  'viewTemplates',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const template = await prisma.template.findUnique({
        where: { id, lineAccountId: user.lineAccountId },
      })
      if (!template) return errorResponse('Template not found', 404)
      return successResponse({ template })
    } catch (error) {
      console.error('Error fetching template:', error)
      return errorResponse('Failed to fetch template', 500)
    }
  }
)

export const PATCH = withPermission(
  'manageTemplates',
  async (user, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const body = (await request.json().catch(() => null)) as any
      const data: any = {}
      if (body?.title != null) data.title = sanitizeText(body.title, { maxLen: 120 })
      if (body?.content != null) data.content = sanitizeText(body.content, { maxLen: 5000 })
      if (body?.category != null) data.category = sanitizeText(body.category, { maxLen: 120 })
      if (body?.category === null) data.category = null
      if (Array.isArray(body?.shortcuts)) {
        data.shortcuts = body.shortcuts
          .filter((s: any) => typeof s === 'string' && s.trim())
          .map((s: string) => sanitizeText(s, { maxLen: 64 }))
          .filter(Boolean)
      }
      if (Array.isArray(body?.variables)) {
        data.variables = body.variables
          .filter((s: any) => typeof s === 'string' && s.trim())
          .map((s: string) => sanitizeText(s, { maxLen: 64 }))
          .filter(Boolean)
      }

      const template = await prisma.template.update({
        where: { id, lineAccountId: user.lineAccountId },
        data,
        select: { id: true },
      })

      return successResponse({ template })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return errorResponse('Template not found', 404)
      }
      console.error('Error updating template:', error)
      return errorResponse('Failed to update template', 500)
    }
  }
)

export const DELETE = withPermission(
  'manageTemplates',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      await prisma.template.delete({
        where: { id, lineAccountId: user.lineAccountId },
      })
      return successResponse({ ok: true })
    } catch (error: any) {
      if (typeof error?.code === 'string' && error.code === 'P2025') {
        return successResponse({ ok: true })
      }
      console.error('Error deleting template:', error)
      return errorResponse('Failed to delete template', 500)
    }
  }
)
