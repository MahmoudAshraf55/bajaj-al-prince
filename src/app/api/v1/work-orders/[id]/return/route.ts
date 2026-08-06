import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { AccountingService } from '@/services/AccountingService';
import { ACCOUNT_CODES } from '@/constants/accounting';
import { computeTaxTotal, nextInvoiceNumber } from '@/lib/order-totals';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;

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
      if (wo.status !== 'completed') {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Only completed work orders can be returned' }, { status: 400 }));
      }

      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
      const partsTotal = wo.parts.reduce((s, p) => s + Number(p.total), 0);
      const labourTotal = wo.labourLines.reduce((s, l) => s + Number(l.total || 0), 0);
      const taxTotal = computeTaxTotal(wo.parts.map((p) => ({
        amount: Number(p.total),
        taxRate: p.product?.taxRate,
        taxExempt: p.product?.taxExempt,
      })));
      // Refund the full invoiced amount: parts + labour + parts tax.
      const total = partsTotal + labourTotal + taxTotal;

      const result = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const returnNumber = await nextInvoiceNumber(tx, tenantId, 'RET');

        await tx.workOrder.update({
          where: { id },
          data: { status: 'returned' },
        });

        for (const part of wo.parts) {
          await tx.product.update({
            where: { id: part.productId },
            data: { stock: { increment: part.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: part.productId,
              type: 'in',
              quantity: part.quantity,
              reference: `work-order-return-${id}`,
              notes: `Return from work order ${wo.description?.substring(0, 100) || ''}`,
              createdById: payload.userId,
              tenantId,
            },
          });
        }

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
              productName: wo.labourLines.map((l) => l.description).join(', ') || 'Labour Return',
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

        const returnInvoice = await tx.invoice.create({
          data: {
            number: returnNumber,
            type: 'return',
            status: 'confirmed',
            subtotal: -subtotal,
            taxTotal: -taxTotal,
            discount: 0,
            total: -total,
            paid: 0,
            change: 0,
            customerId: customer?.id || null,
            customerName: customer?.name || null,
            workOrderId: id,
            createdById: payload.userId,
            tenantId,
            items: invoiceItems.length > 0 ? {
              create: invoiceItems.map((item) => ({
                ...item,
                unitPrice: -item.unitPrice,
                total: -item.total,
              })),
            } : undefined,
          },
        });

        const inventoryId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.INVENTORY, tenantId);
        const cogsId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.COGS, tenantId);
        const partsSalesId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.PARTS_SALES, tenantId);
        const serviceRevenueId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.SERVICE_REVENUE, tenantId);
        const salesRevenueId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.SALES_REVENUE, tenantId);
        const cashId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.CASH, tenantId);

        const partsCostTotal = wo.parts.reduce((s, p) => s + (Number(p.product?.costPrice || 0) * p.quantity), 0);

        const reversalLines: Array<{
          accountId: string;
          debit: number;
          credit: number;
          description: string;
          tenantId: string;
        }> = [];

        reversalLines.push({ accountId: cashId, debit: 0, credit: total, description: 'Work order return reversal', tenantId });

        if (partsCostTotal > 0) {
          reversalLines.push({ accountId: inventoryId, debit: partsCostTotal, credit: 0, description: 'Stock return', tenantId });
          reversalLines.push({ accountId: cogsId, debit: 0, credit: partsCostTotal, description: 'COGS reversal', tenantId });
        }
        if (partsTotal > 0) {
          reversalLines.push({ accountId: partsSalesId, debit: partsTotal, credit: 0, description: 'Parts revenue reversal', tenantId });
        }
        if (labourTotal > 0) {
          reversalLines.push({ accountId: serviceRevenueId, debit: labourTotal, credit: 0, description: 'Labour revenue reversal', tenantId });
        }
        // The sale journal credited Sales Revenue for the full total (parts +
        // labour + parts tax). Reverse the tax portion so the entry balances.
        if (taxTotal > 0) {
          reversalLines.push({ accountId: salesRevenueId, debit: taxTotal, credit: 0, description: 'Tax reversal', tenantId });
        }

        await tx.journalEntry.create({
          data: {
            type: 'RETURN',
            amount: total,
            description: `Work order return: ${wo.description?.substring(0, 100) || ''}`,
            referenceType: 'work_order',
            referenceId: id,
            referenceNumber: returnNumber,
            category: undefined,
            paymentMethod: undefined,
            date: now,
            createdById: payload.userId,
            tenantId,
            lines: { create: reversalLines },
          },
        });

        return { returnInvoice, returnNumber };
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'return',
        entity: 'WorkOrder',
        entityId: id,
        newValue: { status: 'returned', returnInvoice: result.returnNumber } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: { workOrderId: id, returnInvoice: result.returnInvoice },
      }));
    });
  } catch (error) {
    logger.error('Work order return error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: errorMessage }, { status: 500 }));
  }
}
