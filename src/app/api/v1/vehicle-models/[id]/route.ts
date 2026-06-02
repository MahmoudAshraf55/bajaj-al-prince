import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { z } from 'zod';

const modelUpdateSchema = z.object({
  name: sanitizedString(z.string().min(1).max(100)).optional(),
  make: sanitizedString(z.string().min(1).max(100)).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    const body = await req.json();
    const data = modelUpdateSchema.parse(body);
    const model = await prisma.vehicleModel.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: { model } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    await prisma.vehicleModel.softDelete({ id });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
