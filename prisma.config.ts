// prisma.config.ts
// Configuration file for Prisma CLI (migrate, db push, etc.)
// Uses DIRECT_DATABASE_URL for CLI operations
// Runtime uses DATABASE_URL (with Accelerate connection string)

import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use DIRECT_DATABASE_URL for CLI operations (migrate, db push, etc.)
    // This should be your direct MySQL connection (not Accelerate connection)
    // Falls back to DATABASE_URL if DIRECT_DATABASE_URL is not set
    url: env('DIRECT_DATABASE_URL') || env('DATABASE_URL'),
  },
})
