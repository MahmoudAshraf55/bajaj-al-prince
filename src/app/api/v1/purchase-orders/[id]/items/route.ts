import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { z } from 'zod';

const addItemsSchema = z.object({
  items: z.array(z.object({
    barcode: z.string().optional().nullable(),
    productName: z.string().optional().nullable(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0).optional().nullable(),
    total: z.number().min(0).optional().nullable(),
    matchedProduct: z.object({ id: z.string() }).optional().nullable(),
  })),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const body = await req.json();
      const data = addItemsSchema.parse(body);

      const order = await prisma.purchaseOrder.findFirst({ where: { id, isDeleted: false } });
      if (!order) return withSecurityHeaders(NextResponse.json({ success: false, error: 'Not found' }, { status: 404 }));
      if (order.status !== 'ordered') return withSecurityHeaders(NextResponse.json({ success: false, error: 'Can only add to ordered POs' }, { status: 400 }));

      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
      let added = 0;

      await prisma.$transaction(async (tx) => {
        for (const item of data.items) {
          const productId: string | null = item.matchedProduct?.id || null;
          const unitPrice = item.unitPrice ?? (item.total ? (item.total / item.quantity) : 0);

          if (!productId) continue;

          const product = await tx.product.findFirst({
            where: { id: productId, isDeleted: false },
            select: { id: true },
          });
          if (!product) {
            throw new Error(`Product ${productId} not found or does not belong to this tenant`);
          }

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: id,
              productId,
              quantity: item.quantity,
              unitPrice,
              total: unitPrice * item.quantity,
              tenantId,
            },
          });
          added++;
        }

        // Recalculate totals
        const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
        const subtotal = items.reduce((s, i) => s + Number(i.total), 0);
        await tx.purchaseOrder.update({ where: { id }, data: { subtotal, total: subtotal } });
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { added } }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 500 }));
  }
}
