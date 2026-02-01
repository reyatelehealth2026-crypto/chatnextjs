import { S3Client } from '@aws-sdk/client-s3'

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

