import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { validateOrigin, withSecurityHeaders } from '@/lib/security';
import { logAudit, getClientInfo } from '@/lib/audit';
import { sanitizedString } from '@/lib/sanitize';
import { sendWhatsAppMessageViaService } from '@/lib/whatsapp-client';
import { buildMessage } from '@/lib/whatsapp-templates';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { z } from 'zod';

const workOrderSchema = z.object({
  description: sanitizedString(z.string().min(3).max(2000)),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().default('pending'),
  cost: z.number().min(0).max(999999.99).optional(),
  vehicleId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  try {
    return await withAuth(req, async () => {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
      const status = searchParams.get('status');
      const vehicleId = searchParams.get('vehicleId');
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (vehicleId) where.vehicleId = vehicleId;

      const [workOrders, total] = await Promise.all([
        prisma.workOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            vehicle: {
              include: { customer: true },
            },
            parts: {
              include: { product: { select: { id: true, name: true, barcode: true } } },
            },
            labourLines: true,
          },
        }),
        prisma.workOrder.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          workOrders,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  const originCheck = validateOrigin(req);
  if (originCheck) return withSecurityHeaders(originCheck);

  try {
    return await withAuth(req, async () => {
      const body = await req.json();
      const data = workOrderSchema.parse(body);

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, isDeleted: false },
      });
      if (!vehicle) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 }));
      }

      const workOrder = await prisma.workOrder.create({
        data: {
          description: data.description,
          status: data.status || 'pending',
          cost: data.cost || null,
          vehicleId: data.vehicleId,
          tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
        },
        include: { vehicle: { include: { customer: true } } },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        action: 'create',
        entity: 'WorkOrder',
        entityId: workOrder.id,
        newValue: { description: data.description, vehicleId: data.vehicleId } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      // Fire-and-forget WhatsApp notification for work_order_created
      const customer = workOrder.vehicle?.customer;
      if (customer?.phone) {
        buildMessage('work_order_created', {
          name: customer.name,
          model: workOrder.vehicle?.model ?? '',
          work: data.description,
          cost: data.cost ? `${data.cost}` : undefined,
        }).then((message) => {
          if (message) {
            sendWhatsAppMessageViaService(customer.phone!, message).catch(() => {});
          }
        });
      }

      return withSecurityHeaders(NextResponse.json({ success: true, data: { workOrder } }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
