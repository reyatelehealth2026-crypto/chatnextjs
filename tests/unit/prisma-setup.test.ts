/**
 * Prisma Setup Tests
 * 
 * These tests verify that Prisma is correctly configured and can be imported.
 * Note: These tests don't require a running database.
 */

import { describe, it, expect } from 'vitest'

describe('Prisma Setup', () => {
  it('should be able to import Prisma client singleton', async () => {
    // Dynamic import to avoid connection attempts during test
    const { default: prisma } = await import('@/lib/prisma')
    
    expect(prisma).toBeDefined()
    expect(typeof prisma).toBe('object')
  })

  it('should have PrismaClient methods available', async () => {
    const { default: prisma } = await import('@/lib/prisma')
    
    // Verify that common Prisma methods exist
    expect(prisma.$connect).toBeDefined()
    expect(prisma.$disconnect).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
    expect(typeof prisma.$disconnect).toBe('function')
  })

  it('should export a singleton instance', async () => {
    const { default: prisma1 } = await import('@/lib/prisma')
    const { default: prisma2 } = await import('@/lib/prisma')
    
    // Both imports should reference the same instance
    expect(prisma1).toBe(prisma2)
  })
})
