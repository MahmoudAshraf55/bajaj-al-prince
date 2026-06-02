import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const vehicleUpdateSchema = z.object({
  make: sanitizedString(z.string().min(1).max(100)).optional(),
  model: sanitizedString(z.string().min(1).max(100)).optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  chassisNumber: sanitizedString(z.string().max(100)).optional().nullable(),
  plateNumber: sanitizedString(z.string().max(50)).optional().nullable(),
  customerId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    const vehicle = await prisma.vehicle.findFirst({
      where: { id },
      include: { customer: true },
    });
    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { vehicle } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    const body = await req.json();
    const data = vehicleUpdateSchema.parse(body);
    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: { vehicle } });
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    await prisma.vehicle.softDelete({ id });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
