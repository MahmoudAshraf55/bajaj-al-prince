import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { createDoubleEntry } from '@/lib/journal';
import { Prisma } from '@prisma/client';

const adjustmentSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().int().positive(),
  notes: sanitizedString(z.string().max(500)).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
      const skip = (page - 1) * limit;
      const productId = searchParams.get('productId');
      const type = searchParams.get('type');

      const where: Prisma.StockMovementWhereInput = {};
      if (productId) where.productId = productId;
      if (type) where.type = type as 'in' | 'out' | 'adjustment';

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { id: true, name: true, barcode: true } },
            createdBy: { select: { id: true, username: true } },
          },
        }),
        prisma.stockMovement.count({ where }),
      ]);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          movements: movements.map((m) => ({ ...m, quantity: m.quantity })),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const body = await req.json();
      const data = adjustmentSchema.parse(body);

      const product = await prisma.product.findUnique({ where: { id: data.productId, isDeleted: false } });
      if (!product) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 }));
      }

      await prisma.$transaction(async (tx) => {
        let stockChange: number;
        if (data.type === 'in') stockChange = data.quantity;
        else if (data.type === 'out') stockChange = -data.quantity;
        else stockChange = data.quantity;

        await tx.product.update({
          where: { id: data.productId },
          data: { stock: { increment: stockChange } },
        });

        const tid = getTenantId() ?? DEFAULT_TENANT_ID;
        await tx.stockMovement.create({
          data: {
            productId: data.productId,
            type: data.type,
            quantity: data.quantity,
            notes: data.notes,
            createdById: payload.userId,
            tenantId: tid,
          },
        });

        await createDoubleEntry(tx, {
          type: 'STOCK_ADJUSTMENT',
          amount: 0,
          description: `Stock ${data.type}: ${product.name} x${data.quantity}${data.notes ? ` - ${data.notes}` : ''}`,
          referenceType: 'stock_movement',
          referenceId: data.productId,
          createdById: payload.userId,
          tenantId: tid,
        });
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'StockMovement',
        entityId: data.productId,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { message: 'Stock adjusted successfully' } }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
