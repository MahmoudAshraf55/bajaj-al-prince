import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { createDoubleEntry } from '@/lib/journal';
import { AccountingService } from '@/services/AccountingService';
import { ACCOUNT_CODES } from '@/constants/accounting';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;

      const invoice = await prisma.invoice.findFirst({
        where: { id, isDeleted: false },
        include: {
          items: true,
          payments: { where: { isDeleted: false } },
          createdBy: { select: { id: true, username: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      });

      if (!invoice) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 }));
      }

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          invoice: {
            ...invoice,
            subtotal: Number(invoice.subtotal),
            taxTotal: Number(invoice.taxTotal),
            discount: Number(invoice.discount),
            total: Number(invoice.total),
            paid: Number(invoice.paid),
            change: Number(invoice.change),
            items: invoice.items.map((item) => ({
              ...item,
              unitPrice: Number(item.unitPrice),
              costPrice: Number(item.costPrice),
              total: Number(item.total),
            })),
            payments: invoice.payments.map((p) => ({
              ...p,
              amount: Number(p.amount),
            })),
          },
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : message === 'Invoice not found' ? 404 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}

const updateInvoiceSchema = z.object({
  status: z.enum(['cancelled']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = updateInvoiceSchema.parse(body);

      const invoice = await prisma.invoice.findFirst({
        where: { id, isDeleted: false },
        include: { items: true },
      });

      if (!invoice) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 }));
      }

      if (invoice.status === 'cancelled') {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invoice is already cancelled' }, { status: 400 }));
      }

      if (data.status === 'cancelled') {
        await prisma.$transaction(async (tx) => {
          await tx.invoice.update({ where: { id }, data: { status: 'cancelled' } });

          for (const item of invoice.items) {
            const stockDelta = invoice.type === 'sale' ? item.quantity : -item.quantity;
            const movementType = invoice.type === 'sale' ? 'in' : 'out';
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: stockDelta } },
            });
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: movementType as 'in' | 'out',
                quantity: item.quantity,
                reference: `cancelled-${invoice.number}`,
                notes: `Stock returned from cancelled invoice ${invoice.number}`,
                createdById: payload.userId,
                tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
              },
            });
          }

          if (invoice.type === 'sale' && Number(invoice.total) > 0) {
            // F-076: Pass amountPaid so RETURN reversal correctly reverses
            // all three legs (Revenue, Cash, AR) for partial payments
            const paid = Number(invoice.paid);
            await createDoubleEntry(tx, {
              type: 'RETURN',
              amount: Number(invoice.total),
              amountPaid: paid > 0 && paid < Number(invoice.total) ? paid : undefined,
              description: `Cancelled invoice ${invoice.number}`,
              referenceType: 'invoice',
              referenceId: invoice.id,
              referenceNumber: invoice.number,
              paymentMethod: invoice.paymentMethod ?? 'cash',
              createdById: payload.userId,
              tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
            });
          } else if (invoice.type === 'purchase' && Number(invoice.total) > 0) {
            const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
            const inventoryId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.INVENTORY, tenantId);
            const accountsPayableId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.ACCOUNTS_PAYABLE, tenantId);
            await tx.journalEntry.create({
              data: {
                type: 'RETURN',
                amount: Number(invoice.total),
                description: `Cancelled purchase invoice ${invoice.number}`,
                referenceType: 'invoice',
                referenceId: invoice.id,
                referenceNumber: invoice.number,
                date: new Date(),
                createdById: payload.userId,
                tenantId,
                lines: {
                  create: [
                    { accountId: accountsPayableId, debit: Number(invoice.total), credit: 0, description: 'AP reversal', tenantId },
                    { accountId: inventoryId, debit: 0, credit: Number(invoice.total), description: 'Inventory reversal', tenantId },
                  ],
                },
              },
            });
          }
        });
      }

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'update',
        entity: 'Invoice',
        entityId: id,
        oldValue: { status: invoice.status } as Record<string, unknown>,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      const updated = await prisma.invoice.findUnique({
        where: { id },
        include: { items: true, payments: { where: { isDeleted: false } } },
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          invoice: {
            ...updated,
            subtotal: Number(updated!.subtotal),
            taxTotal: Number(updated!.taxTotal),
            discount: Number(updated!.discount),
            total: Number(updated!.total),
            paid: Number(updated!.paid),
            change: Number(updated!.change),
            items: updated!.items.map((item) => ({
              ...item,
              unitPrice: Number(item.unitPrice),
              costPrice: Number(item.costPrice),
              total: Number(item.total),
            })),
            payments: updated!.payments.map((p) => ({
              ...p,
              amount: Number(p.amount),
            })),
          },
        },
      }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : message === 'Invoice not found' ? 404 : message.startsWith('Invoice is already') ? 400 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
