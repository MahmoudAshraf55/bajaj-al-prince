import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid().optional(),
  notes: sanitizedString(z.string().max(2000)).optional().nullable(),
  subtotal: z.number().min(0).optional(),
  taxTotal: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  items: z.array(purchaseOrderItemSchema).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const order = await prisma.purchaseOrder.findFirst({
        where: { id },
        include: {
          supplier: true,
          createdBy: { select: { id: true, username: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
            orderBy: { createdAt: 'asc' },
          },
          receipts: {
            orderBy: { createdAt: 'desc' },
            include: {
              receivedBy: { select: { id: true, username: true } },
              items: {
                include: { product: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });
      if (!order) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 }));
      }
      return withSecurityHeaders(NextResponse.json({ success: true, data: { order } }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = updatePurchaseOrderSchema.parse(body);

      const existing = await prisma.purchaseOrder.findFirst({ where: { id } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 }));
      }
      if (existing.status !== 'draft') {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Only draft orders can be updated' }, { status: 400 }));
      }

      const updateData: Record<string, unknown> = {};
      if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
      if (data.taxTotal !== undefined) updateData.taxTotal = data.taxTotal;
      if (data.discount !== undefined) updateData.discount = data.discount;
      if (data.total !== undefined) updateData.total = data.total;

      const updated = await prisma.$transaction(async (tx) => {
        if (data.items) {
          // Delete existing items
          await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
          // Create new items
          for (const item of data.items) {
            await tx.purchaseOrderItem.create({
              data: {
                purchaseOrderId: id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              },
            });
          }
        }
        return tx.purchaseOrder.update({
          where: { id },
          data: updateData,
          include: {
            items: { include: { product: { select: { id: true, name: true } } } },
            supplier: { select: { id: true, name: true } },
          },
        });
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'PurchaseOrder',
        entityId: id,
        oldValue: { number: existing.number, status: existing.status } as Record<string, unknown>,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { order: updated } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async (payload) => {
      const { id } = await params;
      const existing = await prisma.purchaseOrder.findFirst({ where: { id } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 }));
      }
      if (existing.status !== 'draft') {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Only draft orders can be deleted' }, { status: 400 }));
      }

      await prisma.purchaseOrder.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'delete',
        entity: 'PurchaseOrder',
        entityId: id,
        oldValue: { number: existing.number } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
