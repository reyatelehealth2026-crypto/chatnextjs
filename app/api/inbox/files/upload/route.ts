import { NextRequest } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createS3Client, getS3Config } from '@/lib/s3'
import { errorResponse, successResponse, withPermission } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/sanitize'

/**
 * POST /api/inbox/files/upload
 * Returns a presigned PUT url for direct-to-S3 upload.
 *
 * Requirements: 11.1, 11.4
 */
export const POST = withPermission('viewConversations', async (user, request: NextRequest) => {
  try {
    const cfg = getS3Config()
    const client = createS3Client()
    if (!cfg || !client) {
      return errorResponse('S3 is not configured', 400)
    }

    const body = (await request.json().catch(() => null)) as
      | { fileName?: unknown; fileSize?: unknown; mimeType?: unknown }
      | null

    const fileName = sanitizeText(body?.fileName, { maxLen: 200 }) || null
    const mimeType = sanitizeText(body?.mimeType, { maxLen: 120 }) || null
    const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : null

    if (!fileName || !mimeType || !fileSize) {
      return errorResponse('fileName, mimeType, fileSize are required', 400)
    }

    // Simple validation (10MB default per spec for docs).
    if (fileSize <= 0 || fileSize > 10 * 1024 * 1024) {
      return errorResponse('File size is invalid or too large (max 10MB)', 400)
    }

    const safeName = fileName.replace(/[^\w.\-]+/g, '_')
    const storageKey = `${user.lineAccountId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: storageKey,
        ContentType: mimeType,
      }),
      { expiresIn: 60 * 5 }
    )

    // Public URL is provider-specific; we return endpoint-based path to store and later resolve.
    const url = `${cfg.endpoint.replace(/\/+$/, '')}/${cfg.bucket}/${storageKey}`

    return successResponse({ uploadUrl, storageKey, url })
  } catch (error) {
    console.error('Error creating upload URL:', error)
    return errorResponse('Failed to create upload URL', 500)
  }
})
