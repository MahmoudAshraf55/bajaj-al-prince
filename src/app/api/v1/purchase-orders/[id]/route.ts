import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
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
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
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
      if (data.supplierId !== undefined) {
        // F-066: Validate supplier belongs to current tenant
        const supplier = await prisma.supplier.findFirst({
          where: { id: data.supplierId, isDeleted: false },
          select: { id: true },
        });
        if (!supplier) {
          return withSecurityHeaders(NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 400 }));
        }
        updateData.supplierId = data.supplierId;
      }
      if (data.notes !== undefined) updateData.notes = data.notes;

      const updated = await prisma.$transaction(async (tx) => {
        if (data.items) {
          const productIds = data.items.map((i) => i.productId);
          const products = await tx.product.findMany({
            where: { id: { in: productIds }, isDeleted: false },
            select: { id: true, price: true },
          });
          if (products.length !== productIds.length) {
            const foundIds = new Set(products.map((p) => p.id));
            const missing = productIds.filter((id) => !foundIds.has(id));
            throw new Error(`Products not found or belong to another tenant: ${missing.join(', ')}`);
          }

          const productPriceMap = new Map(products.map((p) => [p.id, Number(p.price)]));

          await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
          for (const item of data.items) {
            const serverUnitPrice = productPriceMap.get(item.productId) ?? item.unitPrice;
            const serverTotal = serverUnitPrice * item.quantity;
            await tx.purchaseOrderItem.create({
              data: {
                purchaseOrderId: id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: serverUnitPrice,
                total: serverTotal,
                tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
              },
            });
          }

          const allItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
          const recalculatedSubtotal = allItems.reduce((s, i) => s + Number(i.total), 0);
          const currentPO = await tx.purchaseOrder.findFirst({ where: { id }, select: { taxTotal: true, discount: true } });
          const taxTotal = Number(currentPO?.taxTotal ?? 0);
          const discount = Number(currentPO?.discount ?? 0);
          updateData.subtotal = recalculatedSubtotal;
          updateData.total = recalculatedSubtotal + taxTotal - discount;
        } else if (data.subtotal !== undefined || data.taxTotal !== undefined || data.discount !== undefined) {
          const currentPO = await tx.purchaseOrder.findFirst({ where: { id }, select: { subtotal: true, taxTotal: true, discount: true } });
          const sub = data.subtotal ?? Number(currentPO?.subtotal ?? 0);
          const tax = data.taxTotal ?? Number(currentPO?.taxTotal ?? 0);
          const disc = data.discount ?? Number(currentPO?.discount ?? 0);
          updateData.subtotal = sub;
          updateData.taxTotal = tax;
          updateData.discount = disc;
          updateData.total = sub + tax - disc;
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
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
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
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
