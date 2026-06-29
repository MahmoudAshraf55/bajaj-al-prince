import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { logAudit, getClientInfo } from '@/lib/audit';
import { sanitizedString } from '@/lib/sanitize';
import { sendWhatsAppMessageViaService } from '@/lib/whatsapp-client';
import { buildMessage } from '@/lib/whatsapp-templates';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  description: sanitizedString(z.string().min(3).max(2000)).optional(),
  cost: z.number().min(0).max(999999.99).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withAuth(req, async () => {
      const { id } = await params;
      const body = await req.json();
      const data = updateSchema.parse(body);

      const existing = await prisma.workOrder.findFirst({ where: { id, isDeleted: false } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }

      const workOrder = await prisma.workOrder.update({
        where: { id },
        data: {
          ...(data.status && { status: data.status }),
          ...(data.description && { description: data.description }),
          ...(data.cost !== undefined && { cost: data.cost }),
        },
        include: { vehicle: { include: { customer: true } } },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        action: 'update',
        entity: 'WorkOrder',
        entityId: id,
        oldValue: { status: existing.status, cost: existing.cost } as Record<string, unknown>,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      // Fire-and-forget WhatsApp notification on status changes
      const eventMap: Record<string, 'work_order_started' | 'work_order_cancelled' | 'work_order_completed'> = {
        in_progress: 'work_order_started',
        cancelled: 'work_order_cancelled',
        completed: 'work_order_completed',
      };

      const customer = workOrder.vehicle?.customer;
      if (data.status && eventMap[data.status] && customer?.phone) {
        const event = eventMap[data.status];
        buildMessage(event, {
          name: customer.name,
          model: workOrder.vehicle?.model ?? '',
          work: workOrder.description,
          cost: workOrder.cost ? `${workOrder.cost}` : undefined,
        }).then((message) => {
          if (message) {
            sendWhatsAppMessageViaService(customer.phone!, message).catch(() => {});
          }
        });
      }

      // Fire-and-forget WhatsApp notification on edit (description or cost changed)
      const isEdit = (data.description && data.description !== existing.description) ||
                     (data.cost !== undefined && data.cost !== Number(existing.cost));
      if (isEdit && !data.status && customer?.phone) {
        buildMessage('work_order_updated', {
          name: customer.name,
          model: workOrder.vehicle?.model ?? '',
          work: data.description ?? workOrder.description,
          cost: data.cost !== undefined ? `${data.cost}` : (workOrder.cost ? `${workOrder.cost}` : undefined),
        }).then((message) => {
          if (message) {
            sendWhatsAppMessageViaService(customer.phone!, message).catch(() => {});
          }
        });
      }

      return withSecurityHeaders(NextResponse.json({ success: true, data: { workOrder } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withAuth(req, async () => {
      const { id } = await params;

      const existing = await prisma.workOrder.findFirst({ where: { id, isDeleted: false } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }

      await prisma.workOrder.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        action: 'delete',
        entity: 'WorkOrder',
        entityId: id,
        oldValue: { status: existing.status } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch {
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
