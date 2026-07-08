import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { AccountingService } from '@/services/AccountingService';

const createPartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const parts = await prisma.workOrderPart.findMany({
        where: { workOrderId: id, isDeleted: false },
        include: { product: { select: { id: true, name: true, barcode: true } } },
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { parts } }));
    });
  } catch (error) {
    logger.error('Work order parts GET error', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = createPartSchema.parse(body);

      const wo = await prisma.workOrder.findFirst({ where: { id, isDeleted: false } });
      if (!wo) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }

      const product = await prisma.product.findFirst({ where: { id: data.productId, isDeleted: false } });
      if (!product) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 }));
      }

      if (product.stock < data.quantity) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 }));
      }

      const unitPrice = data.unitPrice ?? Number(product.price);
      const total = new Prisma.Decimal(unitPrice).times(data.quantity);

      const part = await prisma.$transaction(async (tx) => {
        // Deduct from stock
        await tx.product.update({
          where: { id: data.productId },
          data: { stock: { decrement: data.quantity } },
        });

        // Create accounting journal entry
        const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
        
        try {
          const cogsAccountId = await AccountingService.getAccountId(tx, '5100', tenantId); // COGS
          const inventoryAccountId = await AccountingService.getAccountId(tx, '1201', tenantId); // Inventory

          const journalEntry = await tx.journalEntry.create({
            data: {
              date: new Date(),
              description: `Work Order Part: ${product.name} x${data.quantity}`,
              type: 'STOCK_ADJUSTMENT',
              amount: Number(total),
              createdById: payload.userId,
              tenantId,
            },
          });

          // Debit COGS
          await tx.journalEntryLine.create({
            data: {
              journalEntryId: journalEntry.id,
              accountId: cogsAccountId,
              debit: Number(total),
              credit: 0,
              tenantId,
            },
          });

          // Credit Inventory
          await tx.journalEntryLine.create({
            data: {
              journalEntryId: journalEntry.id,
              accountId: inventoryAccountId,
              debit: 0,
              credit: Number(total),
              tenantId,
            },
          });
        } catch (accountingError) {
          // If accounting fails, log but don't fail the entire transaction
          console.error('Accounting entry creation failed:', accountingError);
        }

        // Create work order part
        return await tx.workOrderPart.create({
          data: {
            workOrderId: id,
            productId: data.productId,
            quantity: data.quantity,
            unitPrice,
            total,
            tenantId,
          },
          include: { product: { select: { id: true, name: true, barcode: true } } },
        });
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'WorkOrderPart',
        entityId: part.id,
        newValue: { workOrderId: id, productId: data.productId, quantity: data.quantity, total: Number(total) } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { part } }, { status: 201 }));
    });
  } catch (error) {
    console.error('Work Order Part creation error:', error);
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    logger.error('Work order parts POST error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return withSecurityHeaders(NextResponse.json({ success: false, error: errorMessage }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const partId = req.nextUrl.searchParams.get('partId');
      if (!partId) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'partId query param required' }, { status: 400 }));
      }
      await prisma.workOrderPart.updateMany({
        where: { id: partId, workOrderId: id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    logger.error('Work order parts DELETE error', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
