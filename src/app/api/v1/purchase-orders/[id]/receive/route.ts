import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';
import { getTenantId } from '@/lib/tenant-context';

const receiveItemSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const receiveSchema = z.object({
  items: z.array(receiveItemSchema).min(1),
  notes: sanitizedString(z.string().max(2000)).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id: purchaseOrderId } = await params;
      const body = await req.json();
      const data = receiveSchema.parse(body);

      const order = await prisma.purchaseOrder.findFirst({
        where: { id: purchaseOrderId },
        include: { items: true },
      });
      if (!order) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 }));
      }
      if (order.status === 'cancelled' || order.status === 'received') {
        return withSecurityHeaders(NextResponse.json({ success: false, error: `Cannot receive a ${order.status} order` }, { status: 400 }));
      }

      // Validate items belong to this order
      for (const ri of data.items) {
        const orderItem = order.items.find((oi) => oi.id === ri.orderItemId);
        if (!orderItem) {
          return withSecurityHeaders(NextResponse.json({ success: false, error: `Item ${ri.orderItemId} not found in order` }, { status: 400 }));
        }
        if (ri.quantity + orderItem.receivedQty > orderItem.quantity) {
          return withSecurityHeaders(NextResponse.json({
            success: false,
            error: `Receiving ${ri.quantity} for item ${orderItem.productId} exceeds ordered quantity (ordered: ${orderItem.quantity}, already received: ${orderItem.receivedQty})`,
          }, { status: 400 }));
        }
      }

      const receiptNumber = `RCP-${purchaseOrderId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
      const tenantId = getTenantId();

      const result = await prisma.$transaction(async (tx) => {
        // Create receipt
        const receipt = await tx.purchaseReceipt.create({
          data: {
            purchaseOrderId,
            receiptNumber,
            notes: data.notes,
            receivedById: payload.userId,
            tenantId: tenantId ?? undefined,
          },
        });

        // Create receipt items + update order item receivedQty + create stock movements
        for (const ri of data.items) {
          const orderItem = order.items.find((oi) => oi.id === ri.orderItemId)!;

          await tx.purchaseReceiptItem.create({
            data: {
              receiptId: receipt.id,
              orderItemId: ri.orderItemId,
              productId: orderItem.productId,
              quantity: ri.quantity,
              unitPrice: orderItem.unitPrice,
              total: orderItem.unitPrice.mul(ri.quantity),
              tenantId: tenantId ?? undefined,
            },
          });

          await tx.purchaseOrderItem.update({
            where: { id: ri.orderItemId },
            data: { receivedQty: { increment: ri.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: orderItem.productId,
              type: 'in',
              quantity: ri.quantity,
              reference: `PO:${order.number} / ${receiptNumber}`,
              notes: data.notes || `Received from PO ${order.number}`,
              createdById: payload.userId,
              tenantId: tenantId ?? undefined,
            },
          });
        }

        // Check if all items fully received
        const updatedItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId },
        });
        const allReceived = updatedItems.every((item) => item.receivedQty >= item.quantity);
        const someReceived = updatedItems.some((item) => item.receivedQty > 0);

        let newStatus = order.status;
        if (allReceived) newStatus = 'received';
        else if (someReceived) newStatus = 'partially_received';

        if (newStatus !== order.status) {
          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: newStatus },
          });
        }

        // Return full receipt with items
        return tx.purchaseReceipt.findUnique({
          where: { id: receipt.id },
          include: {
            items: {
              include: { product: { select: { id: true, name: true } } },
            },
          },
        });
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'PurchaseReceipt',
        entityId: result!.id,
        newValue: { receiptNumber, purchaseOrderId, itemsCount: data.items.length } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { receipt: result } }, { status: 201 }));
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
