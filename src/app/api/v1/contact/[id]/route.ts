import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
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
      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
