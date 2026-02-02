import sharp from 'sharp'

/**
 * Generate thumbnail from image buffer
 * Uses Sharp library (already included in Next.js)
 *
 * @param buffer - Image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Thumbnail dimensions (default: 300x300)
 * @returns Thumbnail as JPEG buffer
 */
export async function generateImageThumbnail(
  buffer: Buffer,
  options = { width: 300, height: 300 }
): Promise<Buffer> {
  return await sharp(buffer)
    .resize(options.width, options.height, {
      fit: 'inside', // Maintain aspect ratio
      withoutEnlargement: true, // Don't upscale small images
    })
    .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
    .toBuffer()
}

/**
 * Generate video thumbnail (placeholder for now)
 * Requires ffmpeg for production - not implemented yet
 *
 * For MVP, we skip video thumbnails or use a placeholder image
 */
export async function generateVideoThumbnail(
  buffer: Buffer
): Promise<Buffer | null> {
  // TODO: Implement with ffmpeg in Phase 3
  // For now, return null (no thumbnail for videos)
  return null
}
