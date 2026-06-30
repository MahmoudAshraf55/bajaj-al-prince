import { prisma } from '@/lib/prisma';
import { ACCOUNT_CODES } from '@/constants/accounting';
import { AccountingService } from './AccountingService';

import { Prisma } from '@prisma/client';

type Tx = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export interface UpdatedWorkOrder {
  description?: string | null;
  parts: Array<{
    productId: string;
    quantity: number;
    unitPrice: string | number | Prisma.Decimal;
    total: string | number | Prisma.Decimal;
    product?: { name: string; costPrice: string | number | Prisma.Decimal | null } | null;
  }>;
  labourLines: Array<{ description: string; total: string | number | Prisma.Decimal }>;
  vehicle?: { customer?: { id: string; name: string } | null } | null;
}

export class WorkOrderService {
  static async completeWorkOrder(
    tx: Tx,
    workOrderId: string,
    tenantId: string,
    userId: string,
    updatedWorkOrder: UpdatedWorkOrder
  ) {
    const partsTotal = updatedWorkOrder.parts.reduce((sum: number, p) => sum + Number(p.total), 0);
    const labourTotal = updatedWorkOrder.labourLines.reduce((sum: number, l) => sum + Number(l.total), 0);
    const totalCost = partsTotal + labourTotal;

    // 1. Deduct stock
    for (const part of updatedWorkOrder.parts) {
      await tx.product.update({
        where: { id: part.productId },
        data: { stock: { decrement: part.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: part.productId,
          type: 'out',
          quantity: part.quantity,
          reference: `work-order-${workOrderId}`,
          notes: `Parts used in work order ${updatedWorkOrder.description?.substring(0, 100) ?? ''}`,
          createdById: userId,
          tenantId,
        },
      });
    }

    // 2. Journal entry + invoice
    if (totalCost > 0) {
      const arId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, tenantId);
      const cogsId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.COGS, tenantId);
      const inventoryId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.INVENTORY, tenantId);
      const partsSalesId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.PARTS_SALES, tenantId);
      const serviceId = await AccountingService.getAccountId(tx, ACCOUNT_CODES.SERVICE_REVENUE, tenantId);

      const partsCostTotal = updatedWorkOrder.parts.reduce(
        (sum: number, p) => sum + (Number(p.product?.costPrice || 0) * p.quantity),
        0
      );

      const jeLines = [];
      jeLines.push({ accountId: arId, debit: totalCost, credit: 0, description: 'Work order total', tenantId });
      if (partsCostTotal > 0) {
        jeLines.push({ accountId: cogsId, debit: partsCostTotal, credit: 0, description: 'Cost of goods sold (parts)', tenantId });
        jeLines.push({ accountId: inventoryId, debit: 0, credit: partsCostTotal, description: 'Parts consumed', tenantId });
      }
      if (partsTotal > 0) {
        jeLines.push({ accountId: partsSalesId, debit: 0, credit: partsTotal, description: 'Parts revenue', tenantId });
      }
      if (labourTotal > 0) {
        jeLines.push({ accountId: serviceId, debit: 0, credit: labourTotal, description: 'Labour revenue', tenantId });
      }

      await tx.journalEntry.create({
        data: {
          type: 'SALE',
          amount: totalCost,
          description: `Work order completed: ${updatedWorkOrder.description?.substring(0, 100) ?? ''}`,
          referenceType: 'work_order',
          referenceId: workOrderId,
          createdById: userId,
          date: new Date(),
          tenantId,
          lines: { create: jeLines },
        },
      });

      const customer = updatedWorkOrder.vehicle?.customer;
      if (customer) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `INV-${dateStr}-`;
        const lastInv = await tx.invoice.findFirst({
          where: { number: { startsWith: prefix } },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        let nextSeq = 1;
        if (lastInv) {
          const invParts = lastInv.number.split('-');
          nextSeq = parseInt(invParts[invParts.length - 1], 10) + 1;
        }
        const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

        const labourTotalAmount = updatedWorkOrder.labourLines.reduce((s: number, l) => s + Number(l.total), 0);
        const labourDescriptions = updatedWorkOrder.labourLines.map((l) => l.description).join(', ');

        const itemMap = new Map<string, { productName: string; unitPrice: number; costPrice: number; quantity: number; total: number; tenantId: string }>();
        for (const p of updatedWorkOrder.parts) {
          const existing = itemMap.get(p.productId);
          if (existing) {
            existing.quantity += p.quantity;
            existing.total += Number(p.total);
          } else {
            itemMap.set(p.productId, {
              productName: p.product?.name ?? 'Part',
              unitPrice: Number(p.unitPrice),
              costPrice: 0,
              quantity: p.quantity,
              total: Number(p.total),
              tenantId,
            });
          }
        }

        if (labourTotalAmount > 0) {
          const usedIds = new Set(updatedWorkOrder.parts.map((p) => p.productId));
          let labourProductId: string | null | undefined;
          if (updatedWorkOrder.parts.length > 0) {
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
              productName: labourDescriptions || 'Labour',
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

        await tx.invoice.create({
          data: {
            number: invoiceNumber,
            type: 'sale',
            status: 'confirmed',
            subtotal,
            taxTotal: 0,
            discount: 0,
            total: subtotal,
            paid: 0,
            change: 0,
            customerId: customer.id,
            customerName: customer.name,
            createdById: userId,
            tenantId,
            items: { create: invoiceItems },
          },
        });
      }
    }
  }
}
