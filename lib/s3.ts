import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export function getS3Config() {
  const bucket = process.env.S3_BUCKET
  const endpoint = process.env.S3_ENDPOINT
  const accessKeyId = process.env.S3_ACCESS_KEY
  const secretAccessKey = process.env.S3_SECRET_KEY
  const region = process.env.S3_REGION || 'auto'

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null
  }

  return {
    bucket,
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
  }
}

export function createS3Client() {
  const cfg = getS3Config()
  if (!cfg) return null

  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: cfg.credentials,
    forcePathStyle: true, // works with many S3-compatible providers
  })
}

/**
 * Upload buffer directly to S3/R2
 * Used for server-side uploads (e.g., downloading media from LINE and storing)
 */
export async function uploadToS3(params: {
  buffer: Buffer
  storageKey: string
  mimeType: string
  client: S3Client
  bucket: string
}): Promise<void> {
  await params.client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.storageKey,
      Body: params.buffer,
      ContentType: params.mimeType,
    })
  )
}

/**
 * Get public URL for uploaded file
 * Uses Cloudflare R2 public development URL
 */
export function getPublicUrl(storageKey: string): string {
  // Use R2 public development URL
  // Format: https://pub-xxxxx.r2.dev/path/to/file
  return `https://pub-1f881c19fcbd4e8fb0fcff4a2328fa83.r2.dev/${storageKey}`
}

