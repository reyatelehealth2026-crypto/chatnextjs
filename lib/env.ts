import { z } from 'zod'

/**
 * Environment Variable Validation Schema
 *
 * This file validates all required environment variables at startup
 * and provides type-safe access to environment configuration.
 */

// Helper to convert placeholder values to undefined
const optionalUrl = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return undefined
    if (val === '' || val.startsWith('your-')) return undefined
    return val
  },
  z.string().url().optional()
)

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid database URL'),
  DATABASE_DIRECT_URL: z.string().url('DATABASE_DIRECT_URL must be a valid database URL').optional(),

  // NextAuth
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

  // LINE API (optional for multi-tenant setup, but required in .env.example)
  LINE_CHANNEL_ID: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
  LINE_ACCESS_TOKEN: z.string().optional(),

  // S3 Storage
  S3_ENDPOINT: optionalUrl,
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),

  // Monitoring (Optional)
  SENTRY_DSN: optionalUrl,

  // Analytics (Optional)
  NEXT_PUBLIC_GA_ID: z.string().optional(),

  // Feature Flags (Optional)
  ENABLE_BROADCASTS: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  ENABLE_GROUPS: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // Rate Limiting (Optional)
  RATE_LIMIT_PER_SESSION: z
    .string()
    .default('120')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_PER_ACCOUNT: z
    .string()
    .default('1200')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10)),
})

/**
 * Validate environment variables
 * This will throw an error at startup if any required variables are missing or invalid
 */
function validateEnv() {
  const parseResult = envSchema.safeParse(process.env)

  if (!parseResult.success) {
    console.error('❌ Environment variable validation failed:')
    console.error(parseResult.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }

  return parseResult.data
}

/**
 * Validated and type-safe environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv()

/**
 * Type for environment variables
 */
export type Env = z.infer<typeof envSchema>
