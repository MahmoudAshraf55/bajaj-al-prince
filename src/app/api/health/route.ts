import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withSecurityHeaders } from '@/lib/security';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  const services: Record<string, string> = {};

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'UP';
  } catch (error) {
    services.database = 'DOWN';
    logger.error('Database health check failed', { error: error instanceof Error ? error.message : 'Unknown' });
  }

  // Redis check (optional — falls back to in-memory if not configured)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const res = await fetch(redisUrl, { method: 'GET', signal: AbortSignal.timeout(2000) });
      services.redis = res.ok ? 'UP' : 'DEGRADED';
    } catch {
      services.redis = 'DOWN';
    }
  } else {
    services.redis = 'NOT_CONFIGURED (using in-memory fallback)';
  }

  const allUp = Object.values(services).every((s) => s === 'UP' || s.startsWith('NOT'));
  const status = allUp ? 'UP' : 'DOWN';
  const httpStatus = allUp ? 200 : 503;

  logger.info('Health check', { status, services });

  return withSecurityHeaders(NextResponse.json({
    success: allUp,
    status,
    timestamp,
    services,
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  }, { status: httpStatus }));
}
