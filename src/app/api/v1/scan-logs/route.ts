import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'staff']);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const barcode = searchParams.get('barcode');
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Record<string, unknown> = { isDeleted: false };
    if (barcode) where.barcode = { contains: barcode, mode: 'insensitive' };
    if (source) where.source = source;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [logs, total] = await Promise.all([
      prisma.barcodeScanLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, nameAr: true, barcode: true } },
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.barcodeScanLog.count({ where }),
    ]);

    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
