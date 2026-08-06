import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { computeWorkOrderTotals } from '@/lib/order-totals';

/**
 * Authoritative totals for a work order, computed on the server from DB rows.
 * The UI renders these so the displayed invoice (tax on parts only, per-product
 * rate) always matches what complete-and-pay will commit.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;

      const wo = await prisma.workOrder.findFirst({
        where: { id, isDeleted: false },
        include: {
          parts: {
            where: { isDeleted: false },
            include: { product: { select: { id: true, name: true, taxRate: true, taxExempt: true } } },
          },
          labourLines: { where: { isDeleted: false } },
        },
      });

      if (!wo) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }

      const totals = computeWorkOrderTotals(wo.parts, wo.labourLines, 0);
      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          ...totals,
          taxLines: wo.parts.map((p) => ({
            productId: p.productId,
            name: p.product?.name ?? null,
            amount: Number(p.total),
            rate: p.product?.taxRate != null ? Number(p.product.taxRate) : null,
            exempt: p.product?.taxExempt ?? false,
          })),
        },
      }));
    });
  } catch {
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
