import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

const modelSchema = z.object({
  name: sanitizedString(z.string().min(1).max(100)),
  make: sanitizedString(z.string().min(1).max(100)).optional().default('Bajaj'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('all') === 'true';

    const models = await prisma.vehicleModel.findMany({
      where: includeInactive ? undefined : { isActive: true, isDeleted: false },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: { models } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    const payload = await requireRole(req, ['admin', 'staff']);
    const body = await req.json();
    const data = modelSchema.parse(body);
    const model = await prisma.vehicleModel.create({ data });
    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: payload.userId,
      action: 'create',
      entity: 'VehicleModel',
      entityId: model.id,
      newValue: data as Record<string, unknown>,
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ success: true, data: { model } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ success: false, error: 'Model name already exists' }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
