import { z } from 'zod'

/**
 * LINE Webhook Event Schemas
 * Based on LINE Messaging API documentation
 */

const lineSourceSchema = z.object({
  type: z.enum(['user', 'group', 'room']),
  userId: z.string().optional(),
  groupId: z.string().optional(),
  roomId: z.string().optional(),
})

const lineTextMessageSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  text: z.string(),
})

const lineImageMessageSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  contentProvider: z.object({
    type: z.enum(['line', 'external']),
    originalContentUrl: z.string().url().optional(),
    previewImageUrl: z.string().url().optional(),
  }).optional(),
})

const lineVideoMessageSchema = z.object({
  id: z.string(),
  type: z.literal('video'),
  duration: z.number().optional(),
  contentProvider: z.object({
    type: z.enum(['line', 'external']),
    originalContentUrl: z.string().url().optional(),
    previewImageUrl: z.string().url().optional(),
  }).optional(),
})

const lineAudioMessageSchema = z.object({
  id: z.string(),
  type: z.literal('audio'),
  duration: z.number().optional(),
  contentProvider: z.object({
    type: z.enum(['line', 'external']),
    originalContentUrl: z.string().url().optional(),
  }).optional(),
})

const lineFileMessageSchema = z.object({
  id: z.string(),
  type: z.literal('file'),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
})

const lineStickerMessageSchema = z.object({
  id: z.string(),
  type: z.literal('sticker'),
  packageId: z.string(),
  stickerId: z.string(),
})

const lineLocationMessageSchema = z.object({
  id: z.string(),
  type: z.literal('location'),
  title: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
})

const lineMessageSchema = z.union([
  lineTextMessageSchema,
  lineImageMessageSchema,
  lineVideoMessageSchema,
  lineAudioMessageSchema,
  lineFileMessageSchema,
  lineStickerMessageSchema,
  lineLocationMessageSchema,
])

const lineMessageEventSchema = z.object({
  type: z.literal('message'),
  replyToken: z.string().optional(),
  source: lineSourceSchema,
  timestamp: z.number(),
  mode: z.enum(['active', 'standby']).optional(),
  message: lineMessageSchema,
})

const lineFollowEventSchema = z.object({
  type: z.literal('follow'),
  replyToken: z.string().optional(),
  source: lineSourceSchema,
  timestamp: z.number(),
  mode: z.enum(['active', 'standby']).optional(),
})

const lineUnfollowEventSchema = z.object({
  type: z.literal('unfollow'),
  source: lineSourceSchema,
  timestamp: z.number(),
  mode: z.enum(['active', 'standby']).optional(),
})

const lineEventSchema = z.union([
  lineMessageEventSchema,
  lineFollowEventSchema,
  lineUnfollowEventSchema,
  z.object({ type: z.string() }), // Allow other event types
])

export const lineWebhookPayloadSchema = z.object({
  destination: z.string().optional(),
  events: z.array(lineEventSchema),
})

export type LineWebhookPayload = z.infer<typeof lineWebhookPayloadSchema>
export type LineMessageEvent = z.infer<typeof lineMessageEventSchema>
