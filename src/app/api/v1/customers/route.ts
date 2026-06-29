import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';

const customerSchema = z.object({
  name: sanitizedString(z.string().min(2).max(200)),
  phone: z.string().min(5).max(30),
  email: z.string().email().optional().nullable(),
  address: sanitizedString(z.string().max(500)).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {

      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
      const skip = (page - 1) * limit;

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { vehicles: true } } },
        }),
        prisma.customer.count(),
      ]);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          customers,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const body = await req.json();
      const data = customerSchema.parse(body);
      const customer = await prisma.customer.create({
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email ?? '',
          address: data.address ?? null,
        },
      });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'Customer',
        entityId: customer.id,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { customer } }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
