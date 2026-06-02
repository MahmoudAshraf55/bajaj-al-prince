import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

const productUpdateSchema = z.object({
  name: sanitizedString(z.string().min(1).max(200)).optional(),
  description: sanitizedString(z.string().max(1000)).optional().nullable(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  category: z.string().min(1).max(100).optional(),
  image: z.string().max(500).optional().nullable(),
  available: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    const payload = await requireRole(req, ['admin', 'staff']);
    const { id } = await params;
    const body = await req.json();
    const data = productUpdateSchema.parse(body);
    const oldProduct = await prisma.product.findUnique({ where: { id } });
    const product = await prisma.$transaction(async (tx) => {
      if (data.stock !== undefined) {
        const current = await tx.product.findUnique({ where: { id }, select: { stock: true } });
        if (!current) throw new Error('Product not found');
      }
      return tx.product.update({ where: { id }, data });
    });
    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: payload.userId,
      action: 'update',
      entity: 'Product',
      entityId: id,
      oldValue: oldProduct ? { name: oldProduct.name, price: Number(oldProduct.price), stock: oldProduct.stock, category: oldProduct.category } as Record<string, unknown> : undefined,
      newValue: data as Record<string, unknown>,
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ success: true, data: { product: { ...product, price: Number(product.price) } } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Product not found') {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
