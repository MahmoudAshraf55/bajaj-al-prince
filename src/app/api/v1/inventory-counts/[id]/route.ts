import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';

const updateItemSchema = z.object({
  productId: z.string(),
  actualQty: z.number().int().min(0),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin', 'staff']);
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
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await requireRole(req, ['admin', 'staff']);
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
      return NextResponse.json({ success: true, data: { count: updated } });
    }

    if (action === 'complete') {
      await prisma.inventoryCount.update({
        where: { id },
        data: { status: 'completed', completedById: payload.userId, completedAt: new Date() },
      });

      const updated = await prisma.inventoryCount.findFirst({ where: { id }, include: { items: true } });
      if (updated) {
        for (const item of updated.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: item.actualQty },
          });
          if (item.variance !== 0) {
            await prisma.stockMovement.create({
              data: {
                productId: item.productId,
                type: 'adjustment',
                quantity: Math.abs(item.variance),
                reference: `Inventory Count: ${updated.name}`,
                notes: `Variance: ${item.variance > 0 ? '+' : ''}${item.variance} (expected: ${item.expectedQty}, actual: ${item.actualQty})`,
                createdById: payload.userId,
              },
            });
            await prisma.journalEntry.create({
              data: {
                type: 'STOCK_ADJUSTMENT',
                amount: 0,
                description: `Inventory count variance: ${updated.name}`,
                referenceType: 'stock_movement',
                referenceId: updated.id,
                createdById: payload.userId,
                date: new Date(),
              },
            });
          }
        }
      }

      const result = await prisma.inventoryCount.findFirst({
        where: { id },
        include: {
          items: { include: { product: { select: { id: true, name: true, nameAr: true, barcode: true, sku: true, unit: true, stock: true } } } },
          createdBy: { select: { id: true, username: true } },
          completedBy: { select: { id: true, username: true } },
        },
      });
      return NextResponse.json({ success: true, data: { count: result } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await params;
    await prisma.inventoryCount.update({ where: { id }, data: { isDeleted: true } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}
