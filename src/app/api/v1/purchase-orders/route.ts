import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  notes: sanitizedString(z.string().max(2000)).optional().nullable(),
  subtotal: z.number().min(0),
  taxTotal: z.number().min(0).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  total: z.number().min(0),
  items: z.array(purchaseOrderItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
      const skip = (page - 1) * limit;
      const search = searchParams.get('search');
      const status = searchParams.get('status');
      const supplierId = searchParams.get('supplierId');

      const where: Prisma.PurchaseOrderWhereInput = {};
      if (search) {
        where.OR = [
          { number: { contains: search, mode: 'insensitive' } },
          { supplier: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }
      if (status) where.status = status;
      if (supplierId) where.supplierId = supplierId;

      const [orders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          include: {
            supplier: { select: { id: true, name: true } },
            createdBy: { select: { id: true, username: true } },
            _count: { select: { items: true, receipts: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.purchaseOrder.count({ where }),
      ]);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          orders,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const body = await req.json();
      const data = createPurchaseOrderSchema.parse(body);

      // Generate PO number
      const count = await prisma.purchaseOrder.count();
      const number = `PO-${String(count + 1).padStart(6, '0')}`;

      const order = await prisma.purchaseOrder.create({
        data: {
          number,
          supplierId: data.supplierId,
          status: 'draft',
          notes: data.notes,
          subtotal: data.subtotal,
          taxTotal: data.taxTotal,
          discount: data.discount,
          total: data.total,
          createdById: payload.userId,
          tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          supplier: { select: { id: true, name: true } },
        },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'PurchaseOrder',
        entityId: order.id,
        newValue: { number: order.number, supplierId: order.supplierId, total: order.total } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { order } }, { status: 201 }));
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
