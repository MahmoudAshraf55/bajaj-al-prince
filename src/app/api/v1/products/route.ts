import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';

const productSchema = z.object({
  name: sanitizedString(z.string().min(1).max(200)),
  description: sanitizedString(z.string().max(1000)).optional().nullable(),
  price: z.number().positive(),
  stock: z.number().int().min(0).optional(),
  category: z.string().min(1).max(100),
  image: z.string().max(500).optional().nullable(),
  available: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.product.count(),
    ]);

    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        products: products.map((p) => ({ ...p, price: Number(p.price) })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    }));
  } catch {
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const payload = await requireRole(req, ['admin', 'staff']);
    const body = await req.json();
    const data = productSchema.parse(body);
    const product = await prisma.product.create({ data });
    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: payload.userId,
      action: 'create',
      entity: 'Product',
      entityId: product.id,
      newValue: data as Record<string, unknown>,
      ipAddress,
      userAgent,
    });
    return withSecurityHeaders(NextResponse.json({ success: true, data: { product: { ...product, price: Number(product.price) } } }, { status: 201 }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
