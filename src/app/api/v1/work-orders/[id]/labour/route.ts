import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { logAudit, getClientInfo } from '@/lib/audit';
import { sanitizedString } from '@/lib/sanitize';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { Prisma } from '@prisma/client';

const createLabourSchema = z.object({
  description: sanitizedString(z.string().min(1).max(500)),
  hours: z.number().min(0).max(999.99).optional(),
  rate: z.number().min(0).max(999999.99).optional(),
  total: z.number().min(0).max(999999.99),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const labour = await prisma.workOrderLabour.findMany({
        where: { workOrderId: id, isDeleted: false },
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { labour } }));
    });
  } catch {
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
      const data = createLabourSchema.parse(body);

      const wo = await prisma.workOrder.findFirst({ where: { id, isDeleted: false } });
      if (!wo) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }

      const labour = await prisma.workOrderLabour.create({
        data: {
          workOrderId: id,
          description: data.description,
          hours: data.hours ?? null,
          rate: data.rate ?? null,
          total: new Prisma.Decimal(data.total),
          tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
        },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'WorkOrderLabour',
        entityId: labour.id,
        newValue: { workOrderId: id, description: data.description, total: data.total } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { labour } }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const labourId = req.nextUrl.searchParams.get('labourId');
      if (!labourId) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'labourId query param required' }, { status: 400 }));
      }
      await prisma.workOrderLabour.updateMany({
        where: { id: labourId, workOrderId: id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch {
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
