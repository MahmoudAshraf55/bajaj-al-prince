import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { logAudit, getClientInfo } from '@/lib/audit';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const counts = await prisma.inventoryCount.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, username: true } },
          completedBy: { select: { id: true, username: true } },
          _count: { select: { items: true } },
        },
      });
      return NextResponse.json({ success: true, data: { counts } });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const body = await req.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

      const { name } = parsed.data;
      const products = await prisma.product.findMany({ where: { isDeleted: false, available: true } });

      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
      const count = await prisma.inventoryCount.create({
        data: {
          name,
          createdById: payload.userId,
          tenantId,
          items: {
            create: products.map((p) => ({
              productId: p.id,
              expectedQty: p.stock,
              actualQty: 0,
              variance: 0,
              unit: p.unit,
              tenantId,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, nameAr: true, barcode: true, unit: true } } } },
          createdBy: { select: { id: true, username: true } },
        },
      });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({ userId: payload.userId, action: 'create', entity: 'InventoryCount', entityId: count.id, newValue: { name, productCount: products.length }, ipAddress, userAgent });
      return NextResponse.json({ success: true, data: { count } }, { status: 201 });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status });
  }
}
