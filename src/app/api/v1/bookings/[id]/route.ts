import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const bookingUpdateSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    const body = await req.json();
    const data = bookingUpdateSchema.parse(body);
    const booking = await prisma.booking.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: { booking } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
