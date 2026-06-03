import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withSecurityHeaders } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    // Perform a simple and fast ping query to verify database connection
    await prisma.$queryRaw`SELECT 1`;

    const response = NextResponse.json({
      success: true,
      status: 'UP',
      timestamp,
      services: {
        database: 'UP',
      },
    }, { status: 200 });

    return withSecurityHeaders(response);
  } catch (error) {
    console.error('[health-check] Database health check failed:', error);

    const response = NextResponse.json({
      success: false,
      status: 'DOWN',
      timestamp,
      services: {
        database: 'DOWN',
      },
      error: 'Database connection failed',
    }, { status: 500 });

    return withSecurityHeaders(response);
  }
}
