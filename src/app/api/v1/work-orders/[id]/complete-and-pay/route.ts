import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { AccountingService } from '@/services/AccountingService';
import { z } from 'zod';

const completeAndPaySchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
  amountPaid: z.number().min(0),
  partsTotal: z.number().min(0),
  labourTotal: z.number().min(0),
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
      const total = data.partsTotal + data.labourTotal;

      const result = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `INV-${dateStr}-`;
        const lastInvoice = await tx.invoice.findFirst({
          where: { tenantId, number: { startsWith: prefix } },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        let nextSeq = 1;
        if (lastInvoice) {
          const invParts = lastInvoice.number.split('-');
          nextSeq = parseInt(invParts[invParts.length - 1], 10) + 1;
        }
        const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

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
          let labourProductId: string | null | undefined;

          if (usedIds.size > 0) {
            labourProductId = (await tx.product.findFirst({
              where: { tenantId, id: { notIn: Array.from(usedIds) }, isDeleted: false },
              select: { id: true },
            }))?.id;
          }
          if (!labourProductId) {
            labourProductId = (await tx.product.findFirst({
              where: { tenantId, isDeleted: false },
              select: { id: true },
            }))?.id;
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
            taxTotal: 0,
            discount: 0,
            total,
            paid: data.amountPaid,
            change: Math.max(0, data.amountPaid - total),
            paymentMethod: data.paymentMethod,
            customerId: customer?.id || null,
            customerName: customer?.name || null,
            createdById: payload.userId,
            tenantId,
            items: invoiceItems.length > 0 ? { create: invoiceItems } : undefined,
          },
        });

        try {
          const salesRevenueAccountId = await AccountingService.getAccountId(tx, '4100', tenantId);
          const accountsReceivableAccountId = await AccountingService.getAccountId(tx, '1103', tenantId);
          let cashAccountId: string;
          if (data.paymentMethod === 'cash' || data.paymentMethod === 'card') {
            cashAccountId = await AccountingService.getAccountId(tx, '1101', tenantId);
          } else {
            cashAccountId = accountsReceivableAccountId;
          }

          const journalEntry = await tx.journalEntry.create({
            data: {
              date: now,
              description: `Work Order Invoice: ${wo.vehicle?.make ?? ''} ${wo.vehicle?.model ?? ''}`.trim(),
              type: 'SALE',
              amount: total,
              referenceType: 'work_order',
              referenceId: id,
              referenceNumber: invoiceNumber,
              createdById: payload.userId,
              tenantId,
            },
          });

          if (data.amountPaid > 0) {
            await tx.journalEntryLine.create({
              data: { journalEntryId: journalEntry.id, accountId: cashAccountId, debit: data.amountPaid, credit: 0, tenantId },
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
        } catch (accountingError) {
          logger.error('Accounting entry creation failed in complete-and-pay', accountingError);
        }

        return { updatedWo, invoice };
      });

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: errorMessage }, { status: 500 }));
  }
}
