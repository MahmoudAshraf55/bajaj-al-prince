import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'staff']);
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
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await requireRole(req, ['admin', 'staff']);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const { name } = parsed.data;
    const products = await prisma.product.findMany({ where: { isDeleted: false, available: true } });

    const count = await prisma.inventoryCount.create({
      data: {
        name,
        createdById: payload.userId,
        items: {
          create: products.map((p) => ({
            productId: p.id,
            expectedQty: p.stock,
            actualQty: 0,
            variance: 0,
            unit: p.unit,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, nameAr: true, barcode: true, unit: true } } } },
        createdBy: { select: { id: true, username: true } },
      },
    });
    return NextResponse.json({ success: true, data: { count } }, { status: 201 });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}
