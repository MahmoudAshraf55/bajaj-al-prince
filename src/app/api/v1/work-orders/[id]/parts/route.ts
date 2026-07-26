import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { Prisma } from '@prisma/client';

const createPartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const parts = await prisma.workOrderPart.findMany({
        where: { workOrderId: id, isDeleted: false },
        include: { product: { select: { id: true, name: true, barcode: true } } },
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { parts } }));
    });
  } catch (error) {
    logger.error('Work order parts GET error', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = createPartSchema.parse(body);

      const wo = await prisma.workOrder.findFirst({ where: { id, isDeleted: false } });
      if (!wo) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }

      const product = await prisma.product.findFirst({ where: { id: data.productId, isDeleted: false } });
      if (!product) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 }));
      }

      if (product.stock < data.quantity) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 }));
      }

      const unitPrice = data.unitPrice ?? Number(product.price);
      const total = new Prisma.Decimal(unitPrice).times(data.quantity);

      const part = await prisma.$transaction(async (tx) => {
        // Stock is reserved at add-time (validated above) but deducted at completion
        // to avoid double deduction. Accounting (COGS/Inventory) is also deferred to completion.

        const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;

        // Create work order part
        return await tx.workOrderPart.create({
          data: {
            workOrderId: id,
            productId: data.productId,
            quantity: data.quantity,
            unitPrice,
            total,
            tenantId,
          },
          include: { product: { select: { id: true, name: true, barcode: true } } },
        });
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'WorkOrderPart',
        entityId: part.id,
        newValue: { workOrderId: id, productId: data.productId, quantity: data.quantity, total: Number(total) } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { part } }, { status: 201 }));
    });
  } catch (error) {
    console.error('Work Order Part creation error:', error);
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    logger.error('Work order parts POST error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: errorMessage }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const partId = req.nextUrl.searchParams.get('partId');
      if (!partId) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'partId query param required' }, { status: 400 }));
      }
      // F-052: Stock is only deducted at completion time (complete-and-pay), not at add-time.
      // So deleting a part before completion requires no stock restoration.
      // NOTE: If migrating from old behavior where stock was deducted at add-time,
      // a data migration script is needed to restore stock for soft-deleted parts
      // on incomplete work orders.
      await prisma.workOrderPart.updateMany({
        where: { id: partId, workOrderId: id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    logger.error('Work order parts DELETE error', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
