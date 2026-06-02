import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    const payload = await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    const oldMessage = await prisma.contactMessage.findUnique({ where: { id } });
    await prisma.contactMessage.softDelete({ id });
    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: payload.userId,
      action: 'softDelete',
      entity: 'ContactMessage',
      entityId: id,
      oldValue: oldMessage ? { name: oldMessage.name, email: oldMessage.email, message: oldMessage.message } as Record<string, unknown> : undefined,
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
