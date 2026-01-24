import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if using Prisma Accelerate (connection string starts with prisma://)
const isAccelerate = process.env.DATABASE_URL?.startsWith('prisma://')

let prismaClient: PrismaClient

if (isAccelerate) {
  // Use Prisma Accelerate extension (dynamic import to avoid errors if not installed)
  try {
    const { withAccelerate } = require('@prisma/extension-accelerate')
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    }).$extends(withAccelerate()) as PrismaClient
  } catch (error) {
    // Fallback to regular Prisma Client if extension not installed
    console.warn('Prisma Accelerate extension not found, using regular Prisma Client')
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
} else {
  // Use regular Prisma Client
  prismaClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
