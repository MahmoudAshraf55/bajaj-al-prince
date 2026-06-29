import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, 'admin');
  if (!rateLimit.allowed) return withSecurityHeaders(rateLimit.response!);

  try {
    return await withRole(req, ['admin'], async () => {

      const permissions = await prisma.permission.findMany({
        where: { isDeleted: false },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: permissions }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
