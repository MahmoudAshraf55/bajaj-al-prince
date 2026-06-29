import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { logAudit, getClientInfo } from '@/lib/audit';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { createDoubleEntry } from '@/lib/journal';
import { z } from 'zod';

const updateItemSchema = z.object({
  productId: z.string(),
  actualQty: z.number().int().min(0),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const count = await prisma.inventoryCount.findFirst({
        where: { id, isDeleted: false },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, nameAr: true, barcode: true, sku: true, unit: true, stock: true } } },
            orderBy: { product: { name: 'asc' } },
          },
          createdBy: { select: { id: true, username: true } },
          completedBy: { select: { id: true, username: true } },
        },
      });
      if (!count) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: { count } });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const { action, items } = body;

      const count = await prisma.inventoryCount.findFirst({ where: { id, isDeleted: false } });
      if (!count) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

      if (action === 'update_items') {
        const parsed = updateItemSchema.array().safeParse(items);
        if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

        for (const item of parsed.data) {
          const existing = await prisma.inventoryCountItem.findUnique({
            where: { countId_productId: { countId: id, productId: item.productId } },
          });
          if (existing) {
            const variance = item.actualQty - existing.expectedQty;
            await prisma.inventoryCountItem.update({
              where: { id: existing.id },
              data: { actualQty: item.actualQty, variance },
            });
          }
        }

        const updated = await prisma.inventoryCount.findFirst({
          where: { id },
          include: {
            items: {
              include: { product: { select: { id: true, name: true, nameAr: true, barcode: true, sku: true, unit: true, stock: true } } },
              orderBy: { product: { name: 'asc' } },
            },
          },
        });
        const { ipAddress, userAgent } = getClientInfo(req);
        await logAudit({ userId: payload.userId, action: 'update', entity: 'InventoryCount', entityId: id, newValue: { itemsUpdated: parsed.data.length }, ipAddress, userAgent });
        return NextResponse.json({ success: true, data: { count: updated } });
      }

      if (action === 'complete') {
        const { ipAddress, userAgent } = getClientInfo(req);

        const txnResult = await prisma.$transaction(async (tx) => {
          await tx.inventoryCount.update({
            where: { id },
            data: { status: 'completed', completedById: payload.userId, completedAt: new Date() },
          });

          const updated = await tx.inventoryCount.findFirst({ where: { id }, include: { items: true } });
          let adjustmentsCount = 0;

          if (updated) {
            for (const item of updated.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: item.actualQty },
              });
              if (item.variance !== 0) {
                adjustmentsCount++;
                const tid = getTenantId() ?? DEFAULT_TENANT_ID;
                await tx.stockMovement.create({
                  data: {
                    productId: item.productId,
                    type: 'adjustment',
                    quantity: Math.abs(item.variance),
                    reference: `Inventory Count: ${updated.name}`,
                    notes: `Variance: ${item.variance > 0 ? '+' : ''}${item.variance} (expected: ${item.expectedQty}, actual: ${item.actualQty})`,
                    createdById: payload.userId,
                    tenantId: tid,
                  },
                });
                await createDoubleEntry(tx, {
                  type: 'STOCK_ADJUSTMENT',
                  amount: 0,
                  description: `Inventory count variance: ${updated.name}`,
                  referenceType: 'stock_movement',
                  referenceId: updated.id,
                  createdById: payload.userId,
                  tenantId: tid,
                });
              }
            }
          }

          return { completed: true, totalItems: updated?.items.length ?? 0, adjustments: adjustmentsCount };
        });

        await logAudit({ userId: payload.userId, action: 'complete', entity: 'InventoryCount', entityId: id, newValue: txnResult, ipAddress, userAgent });

        const countResult = await prisma.inventoryCount.findFirst({
          where: { id },
          include: {
            items: { include: { product: { select: { id: true, name: true, nameAr: true, barcode: true, sku: true, unit: true, stock: true } } } },
            createdBy: { select: { id: true, username: true } },
            completedBy: { select: { id: true, username: true } },
          },
        });
        return NextResponse.json({ success: true, data: { count: countResult } });
      }

      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin'], async (payload) => {
      const { id } = await params;
      const existing = await prisma.inventoryCount.findUnique({ where: { id }, select: { name: true, status: true } });
      await prisma.inventoryCount.update({ where: { id }, data: { isDeleted: true } });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({ userId: payload.userId, action: 'delete', entity: 'InventoryCount', entityId: id, oldValue: existing ?? undefined, ipAddress, userAgent });
      return NextResponse.json({ success: true });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
