import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, withSecurityHeaders } from '@/lib/security';
import { sanitizedString } from '@/lib/sanitize';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { z } from 'zod';

const contactSchema = z.object({
  name: sanitizedString(z.string().min(2).max(100)),
  phone: z.string().min(5).max(30),
  email: z.string().email(),
  message: sanitizedString(z.string().min(10).max(2000)),
});

export async function POST(req: NextRequest) {
  const originCheck = validateOrigin(req);
  if (originCheck) return withSecurityHeaders(originCheck);

  const limit = await checkRateLimit(req, 'contact');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const body = await req.json();
    const data = contactSchema.parse(body);
    const message = await prisma.contactMessage.create({ data: { ...data, tenantId: getTenantId() ?? DEFAULT_TENANT_ID } });
    return withSecurityHeaders(NextResponse.json({ success: true, data: { message } }, { status: 201 }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function GET(req: NextRequest) {
  try {
    return await withAuth(req, async () => {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.contactMessage.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.contactMessage.count(),
      ]);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          messages,
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
