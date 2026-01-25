import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const healthStatus: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
    },
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.services.database = 'ok';
  } catch (error) {
    console.error('Health check failed - Database:', error);
    healthStatus.status = 'error';
    healthStatus.services.database = 'error';
  }

  const statusCode = healthStatus.status === 'ok' ? 200 : 503;
  return NextResponse.json(healthStatus, { status: statusCode });
}
