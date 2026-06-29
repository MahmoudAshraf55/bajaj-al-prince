import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const all = await prisma.product.findMany({
        where: { isDeleted: false, available: true },
        orderBy: { stock: 'asc' },
      });

      const lowStock = all.filter((p) => p.stock <= p.lowStockThreshold);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          products: lowStock.map((p) => ({ ...p, price: Number(p.price) })),
          meta: { total: lowStock.length },
        },
      }));
    });
  } catch {
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
