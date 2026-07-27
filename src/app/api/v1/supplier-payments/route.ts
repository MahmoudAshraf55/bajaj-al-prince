import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { createDoubleEntry } from '@/lib/journal';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const createSupplierPaymentSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  amount: z.number().positive().max(999999999.99),
  paymentMethod: z.enum(['cash', 'card', 'transfer']).default('cash'),
  notes: sanitizedString(z.string().max(1000)).optional().nullable(),
  date: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const body = await req.json();
      const data = createSupplierPaymentSchema.parse(body);
      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;

      const po = await prisma.purchaseOrder.findFirst({
        where: { id: data.purchaseOrderId, isDeleted: false },
        select: { id: true, total: true, paid: true, number: true, status: true },
      });
      if (!po) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 }));
      }

      const currentPaid = Number(po.paid);
      const newPaid = currentPaid + data.amount;
      if (newPaid > Number(po.total) + 0.01) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: `Payment exceeds remaining balance. Total: ${po.total}, Already paid: ${currentPaid}` }, { status: 400 }));
      }

      const paymentStatus = newPaid >= Number(po.total) - 0.01 ? 'paid' : 'partial';

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.supplierPayment.create({
          data: {
            purchaseOrderId: data.purchaseOrderId,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            notes: data.notes,
            date: data.date ? new Date(data.date) : new Date(),
            createdById: payload.userId,
            tenantId,
          },
        });

        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: {
            paid: { increment: data.amount },
            paymentStatus,
          },
        });

        await createDoubleEntry(tx, {
          type: 'SUPPLIER_PAYMENT',
          amount: data.amount,
          description: `Supplier payment for PO ${po.number}`,
          referenceType: 'supplier_payment',
          referenceId: payment.id,
          referenceNumber: po.number,
          paymentMethod: data.paymentMethod,
          createdById: payload.userId,
          date: data.date ? new Date(data.date) : undefined,
          tenantId,
        });

        return payment;
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'SupplierPayment',
        entityId: result.id,
        newValue: { purchaseOrderId: data.purchaseOrderId, amount: data.amount, paymentMethod: data.paymentMethod } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { payment: result } }, { status: 201 }));
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

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
      const skip = (page - 1) * limit;
      const purchaseOrderId = searchParams.get('purchaseOrderId');

      const where: Prisma.SupplierPaymentWhereInput = {};
      if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;

      const [payments, total] = await Promise.all([
        prisma.supplierPayment.findMany({
          where,
          include: {
            purchaseOrder: { select: { id: true, number: true, total: true } },
            createdBy: { select: { id: true, username: true } },
          },
          skip,
          take: limit,
          orderBy: { date: 'desc' },
        }),
        prisma.supplierPayment.count({ where }),
      ]);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          payments,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
