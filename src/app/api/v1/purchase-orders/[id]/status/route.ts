import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';
import { AccountingService } from '@/services/AccountingService';
import { ACCOUNT_CODES } from '@/constants/accounting';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';

const validTransitions: Record<string, string[]> = {
  draft: ['ordered', 'cancelled'],
  ordered: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
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

      if (newStatus === 'cancelled' && (existing.status === 'partially_received' || existing.status === 'received')) {
        if (Number(existing.paid) > 0) {
          return withSecurityHeaders(NextResponse.json({
            success: false,
            error: `Cannot cancel a purchase order with outstanding payments (paid: ${existing.paid}). Reverse supplier payments first.`,
          }, { status: 400 }));
        }

        const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;

        await prisma.$transaction(async (tx) => {
          await tx.purchaseOrder.update({
            where: { id },
            data: { status: 'cancelled', notes: notes !== undefined ? notes : existing.notes },
          });

          const receipts = await tx.purchaseReceipt.findMany({
            where: { purchaseOrderId: id },
            include: { items: true },
          });

          for (const receipt of receipts) {
            for (const ri of receipt.items) {
              const product = await tx.product.findUnique({
                where: { id: ri.productId },
                select: { lockInventory: true },
              });
              if (product && !product.lockInventory) {
                await tx.product.update({
                  where: { id: ri.productId },
                  data: { stock: { decrement: Number(ri.quantity) } },
                });
                await tx.stockMovement.create({
                  data: {
                    productId: ri.productId,
                    type: 'out',
                    quantity: Number(ri.quantity),
                    reference: `PO-cancel:${existing.number}`,
                    notes: `Stock reversed from cancelled PO ${existing.number}`,
                    createdById: payload.userId,
                    tenantId,
                  },
                });
              }
            }
          }

          const totalReceivedAmount = receipts.reduce(
            (sum, r) => sum + r.items.reduce((s, ri) => s + Number(ri.total), 0),
            0,
          );

          if (totalReceivedAmount > 0) {
            const inventoryId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.INVENTORY, tenantId);
            const accountsPayableId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.ACCOUNTS_PAYABLE, tenantId);

            await tx.journalEntry.create({
              data: {
                type: 'RETURN',
                amount: totalReceivedAmount,
                description: `PO cancellation reversal: ${existing.number}`,
                referenceType: 'purchase_order',
                referenceId: id,
                referenceNumber: existing.number,
                date: new Date(),
                createdById: payload.userId,
                tenantId,
                lines: {
                  create: [
                    { accountId: accountsPayableId, debit: totalReceivedAmount, credit: 0, description: 'AP reversal', tenantId },
                    { accountId: inventoryId, debit: 0, credit: totalReceivedAmount, description: 'Inventory reversal', tenantId },
                  ],
                },
              },
            });
          }
        });
      } else {
        await prisma.purchaseOrder.update({
          where: { id },
          data: { status: newStatus, notes: notes !== undefined ? notes : existing.notes },
        });
      }

      const updated = await prisma.purchaseOrder.findFirst({ where: { id } });

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
