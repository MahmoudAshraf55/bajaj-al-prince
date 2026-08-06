import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { AccountingService } from '@/services/AccountingService';
import { ACCOUNT_CODES } from '@/constants/accounting';
import { z } from 'zod';
import { computeWorkOrderTotals, nextInvoiceNumber } from '@/lib/order-totals';

const completeAndPaySchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
  amountPaid: z.number().min(0),
  partsTotal: z.number().min(0).optional(), // Ignored — computed from DB
  labourTotal: z.number().min(0).optional(), // Ignored — computed from DB
  discount: z.number().min(0).default(0),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = completeAndPaySchema.parse(body);

      const wo = await prisma.workOrder.findFirst({
        where: { id, isDeleted: false },
        include: {
          vehicle: { include: { customer: true } },
          parts: { where: { isDeleted: false }, include: { product: true } },
          labourLines: { where: { isDeleted: false } },
        },
      });
      if (!wo) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }
      if (wo.status === 'completed') {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order already completed' }, { status: 400 }));
      }

      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;

      // F-053: Compute totals from DB, not from client-supplied values.
      // Tax applies to parts only, per-product rate, exempt products skipped.
      const totals = computeWorkOrderTotals(wo.parts, wo.labourLines, data.discount);
      const { taxTotal, total, discountAmount } = totals;

      // Retry loop for invoice number race condition.
      // Two concurrent C&P calls may read the same last invoice number
      // and compute the same nextSeq. On P2002 (unique constraint),
      // the whole transaction retries with fresh reads.
      const MAX_RETRIES = 5;
      let lastError: unknown;
      let result: { updatedWo: Awaited<ReturnType<typeof prisma.workOrder.findUniqueOrThrow>>; invoice: Awaited<ReturnType<typeof prisma.invoice.create>> } | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          result = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const invoiceNumber = await nextInvoiceNumber(tx, tenantId, 'INV');

        const updatedWo = await tx.workOrder.update({
          where: { id },
          data: { status: 'completed', cost: total },
          include: { vehicle: { include: { customer: true } } },
        });

        const itemMap = new Map<string, {
          productName: string;
          unitPrice: number;
          costPrice: number;
          quantity: number;
          total: number;
          tenantId: string;
        }>();

        for (const part of wo.parts) {
          const pid = part.productId;
          const existing = itemMap.get(pid);
          if (existing) {
            existing.quantity += part.quantity;
            existing.total += Number(part.total);
          } else {
            itemMap.set(pid, {
              productName: part.product?.name ?? 'Part',
              unitPrice: Number(part.unitPrice),
              costPrice: Number(part.product?.costPrice ?? 0),
              quantity: part.quantity,
              total: Number(part.total),
              tenantId,
            });
          }
        }

        const labourTotalAmount = wo.labourLines.reduce((s, l) => s + (l.total ? Number(l.total) : 0), 0);
        if (labourTotalAmount > 0) {
          const usedIds = new Set(wo.parts.map((p) => p.productId));
          let labourProductId = (await tx.product.findFirst({
            where: { tenantId, isService: true, isDeleted: false },
            select: { id: true },
          }))?.id;
          if (!labourProductId) {
            labourProductId = (await tx.product.create({
              data: {
                name: 'Labour',
                barcode: `SVC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                isService: true,
                price: 0,
                costPrice: 0,
                stock: 0,
                category: 'Services',
                tenantId,
                isDeleted: false,
              },
              select: { id: true },
            })).id;
          }
          if (labourProductId && !usedIds.has(labourProductId)) {
            itemMap.set(labourProductId, {
              productName: wo.labourLines.map((l) => l.description).join(', ') || 'Labour',
              unitPrice: labourTotalAmount,
              costPrice: 0,
              quantity: 1,
              total: labourTotalAmount,
              tenantId,
            });
          }
        }

        const invoiceItems = Array.from(itemMap.entries()).map(([productId, data]) => ({
          productId,
          ...data,
        }));

        const subtotal = invoiceItems.reduce((s, i) => s + i.total, 0);
        const customer = wo.vehicle?.customer;

        const invoice = await tx.invoice.create({
          data: {
            number: invoiceNumber,
            type: 'sale',
            status: 'confirmed',
            subtotal,
            taxTotal: Math.round(taxTotal * 100) / 100,
            discount: discountAmount,
            total,
            paid: data.amountPaid,
            change: Math.max(0, data.amountPaid - total),
            paymentMethod: data.paymentMethod,
            customerId: customer?.id || null,
            customerName: customer?.name || null,
            workOrderId: id,
            createdById: payload.userId,
            tenantId,
            items: invoiceItems.length > 0 ? { create: invoiceItems } : undefined,
            payments: data.amountPaid > 0 ? {
              create: [{
                method: data.paymentMethod,
                amount: new Prisma.Decimal(data.amountPaid),
                reference: null,
                tenantId,
              }],
            } : undefined,
          },
          include: { items: true, payments: true },
        });

        // Deduct stock for parts used + create stock movements (Issue: stock movements were empty)
        for (const part of wo.parts) {
          if (!part.product?.lockInventory) {
            await tx.product.update({
              where: { id: part.productId },
              data: { stock: { decrement: part.quantity } },
            });
          }
          await tx.stockMovement.create({
            data: {
              productId: part.productId,
              type: 'out',
              quantity: part.quantity,
              reference: `WO:${wo.id.slice(0, 8)}/${invoiceNumber}`,
              notes: `Work order completed —${part.product?.name || 'Part'}`,
              createdById: payload.userId,
              tenantId,
            },
          });
        }

        // F-055: Accounting entry MUST succeed — if it fails, the entire transaction
        // rolls back so no incomplete financial state is committed.
        // NOTE: createDoubleEntry() only supports 2-line entries (DR/CR).
        // This route needs a 3-line entry for partial payments:
        //   DR: Cash/Bank (amountPaid)
        //   DR: Accounts Receivable (remaining)
        //   CR: Sales Revenue (total)
        const salesRevenueAccountId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.SALES_REVENUE, tenantId);
        const accountsReceivableAccountId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, tenantId);
        let cashAccountId: string;
        if (data.paymentMethod === 'cash') {
          cashAccountId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.CASH, tenantId);
        } else {
          cashAccountId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.BANK, tenantId);
        }

          // F-076: Cap cash debit to total to prevent imbalance on overpayment
          const cashAmount = Math.min(data.amountPaid, total);

          const journalEntry = await tx.journalEntry.create({
            data: {
              date: now,
              description: `Work Order Invoice: ${wo.vehicle?.make ?? ''} ${wo.vehicle?.model ?? ''}`.trim(),
              type: 'SALE',
              amount: total,
              referenceType: 'work_order',
              referenceId: id,
              referenceNumber: invoiceNumber,
              paymentMethod: data.paymentMethod,
              createdById: payload.userId,
              tenantId,
            },
          });

          if (cashAmount > 0) {
            await tx.journalEntryLine.create({
              data: { journalEntryId: journalEntry.id, accountId: cashAccountId, debit: cashAmount, credit: 0, tenantId },
            });
          }

          await tx.journalEntryLine.create({
            data: { journalEntryId: journalEntry.id, accountId: salesRevenueAccountId, debit: 0, credit: total, tenantId },
          });

          if (data.amountPaid < total) {
            const remaining = total - data.amountPaid;
            await tx.journalEntryLine.create({
              data: { journalEntryId: journalEntry.id, accountId: accountsReceivableAccountId, debit: remaining, credit: 0, tenantId },
            });
          }

        return { updatedWo, invoice };
      });

          break;
        } catch (e) {
          lastError = e;
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            if (attempt < MAX_RETRIES - 1) {
              continue;
            }
            logger.error('Complete and Pay: invoice number retries exhausted', e);
          }
          throw e;
        }
      }

      // Ensure result exists (retries succeeded)
      if (!result) {
        throw lastError ?? new Error('Failed to complete and pay after retries');
      }

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'complete',
        entity: 'WorkOrder',
        entityId: id,
        newValue: { status: 'completed', invoiceId: result.invoice.id, amountPaid: data.amountPaid } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: { workOrder: result.updatedWo, invoice: result.invoice },
      }));
    });
  } catch (error) {
    logger.error('Complete and Pay error', error);
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
