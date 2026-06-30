import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const createSchema = z.object({
  name: sanitizedString(z.string().min(1).max(100)),
  nameAr: sanitizedString(z.string().max(100)).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('all') === 'true';

    const manufacturers = await prisma.manufacturer.findMany({
      where: includeInactive ? undefined : { isActive: true, isDeleted: false },
      orderBy: { name: 'asc' },
    });

    return withSecurityHeaders(NextResponse.json({ success: true, data: { manufacturers: manufacturers.map((m) => ({ ...m, name: m.name })) } }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const body = await req.json();
      const data = createSchema.parse(body);
      const manufacturer = await prisma.manufacturer.create({
        data: { name: data.name, nameAr: data.nameAr ?? null },
      });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'Manufacturer',
        entityId: manufacturer.id,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { manufacturer } }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Manufacturer name already exists' }, { status: 409 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
