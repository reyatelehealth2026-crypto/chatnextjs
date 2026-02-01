import { NextRequest } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import prisma from '@/lib/prisma'
import { createS3Client, getS3Config } from '@/lib/s3'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'

/**
 * GET /api/inbox/files/[id]
 * DELETE /api/inbox/files/[id]
 *
 * Requirements: 11.9 (secure access; here we only expose metadata under tenant auth)
 */
export const GET = withPermission(
  'viewConversations',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const attachment = await prisma.fileAttachment.findUnique({
        where: { id },
        include: {
          message: {
            select: {
              conversation: { select: { id: true, lineAccountId: true } },
            },
          },
        },
      })

      if (!attachment) return errorResponse('File not found', 404)
      if (attachment.message.conversation.lineAccountId !== user.lineAccountId) {
        return errorResponse('Forbidden', 403)
      }

      return successResponse({
        file: {
          id: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          url: attachment.url,
          thumbnailUrl: attachment.thumbnailUrl,
          createdAt: attachment.createdAt,
        },
      })
    } catch (error) {
      console.error('Error fetching file:', error)
      return errorResponse('Failed to fetch file', 500)
    }
  }
)

export const DELETE = withPermission(
  'viewConversations',
  async (user, _request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const attachment = await prisma.fileAttachment.findUnique({
        where: { id },
        include: {
          message: {
            select: {
              conversation: { select: { id: true, lineAccountId: true } },
            },
          },
        },
      })

      if (!attachment) return successResponse({ ok: true })
      if (attachment.message.conversation.lineAccountId !== user.lineAccountId) {
        return errorResponse('Forbidden', 403)
      }

      const cfg = getS3Config()
      const client = createS3Client()
      if (cfg && client) {
        await client.send(
          new DeleteObjectCommand({
            Bucket: cfg.bucket,
            Key: attachment.storageKey,
          })
        )
      }

      await prisma.fileAttachment.delete({ where: { id: attachment.id } })
      return successResponse({ ok: true })
    } catch (error) {
      console.error('Error deleting file:', error)
      return errorResponse('Failed to delete file', 500)
    }
  }
)
