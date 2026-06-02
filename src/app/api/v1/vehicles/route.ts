import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const vehicleSchema = z.object({
  make: sanitizedString(z.string().min(1).max(100)),
  model: sanitizedString(z.string().min(1).max(100)),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  chassisNumber: sanitizedString(z.string().max(100)).optional().nullable(),
  plateNumber: sanitizedString(z.string().max(50)).optional().nullable(),
  customerId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'staff']);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { customer: true } }),
      prisma.vehicle.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        vehicles,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    await requireRole(req, ['admin', 'staff']);
    const body = await req.json();
    const data = vehicleSchema.parse(body);
    const vehicle = await prisma.vehicle.create({ data });
    return NextResponse.json({ success: true, data: { vehicle } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Chassis number already exists for this tenant' }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
