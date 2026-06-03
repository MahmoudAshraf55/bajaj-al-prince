import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';

const bookingUpdateSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const payload = await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    const body = await req.json();
    const data = bookingUpdateSchema.parse(body);
    const oldBooking = await prisma.booking.findUnique({ where: { id } });
    const booking = await prisma.booking.update({ where: { id }, data });
    const { ipAddress, userAgent } = getClientInfo(req);
    const action = data.status === 'accepted' ? 'approve' : data.status === 'rejected' ? 'reject' : 'update';
    await logAudit({
      userId: payload.userId,
      action,
      entity: 'Booking',
      entityId: id,
      oldValue: oldBooking ? { status: oldBooking.status } as Record<string, unknown> : undefined,
      newValue: { status: data.status } as Record<string, unknown>,
      ipAddress,
      userAgent,
    });
    return withSecurityHeaders(NextResponse.json({ success: true, data: { booking } }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
