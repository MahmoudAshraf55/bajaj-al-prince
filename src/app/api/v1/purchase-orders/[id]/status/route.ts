import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

// Status flow: draft -> ordered -> partially_received, received, cancelled
//              ordered -> partially_received, received, cancelled
//              partially_received -> received
const validTransitions: Record<string, string[]> = {
  draft: ['ordered', 'cancelled'],
  ordered: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received'],
};

const statusSchema = z.object({
  status: z.enum(['ordered', 'partially_received', 'received', 'cancelled']),
  notes: sanitizedString(z.string().max(500)).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const { status: newStatus, notes } = statusSchema.parse(body);

      const existing = await prisma.purchaseOrder.findFirst({
        where: { id },
        include: { items: true },
      });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 }));
      }

      const allowed = validTransitions[existing.status];
      if (!allowed || !allowed.includes(newStatus)) {
        return withSecurityHeaders(NextResponse.json({
          success: false,
          error: `Cannot transition from '${existing.status}' to '${newStatus}'`,
        }, { status: 400 }));
      }

      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: newStatus, notes: notes !== undefined ? notes : existing.notes },
      });

      // If cancelled, record audit
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'PurchaseOrder',
        entityId: id,
        oldValue: { number: existing.number, status: existing.status } as Record<string, unknown>,
        newValue: { status: newStatus, notes } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { order: updated } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
