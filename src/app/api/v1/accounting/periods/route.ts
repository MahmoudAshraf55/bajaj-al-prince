import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { logAudit, getClientInfo } from '@/lib/audit';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const periods = await prisma.accountingPeriod.findMany({
        where: { isDeleted: false },
        orderBy: { startDate: 'desc' },
        include: { closedBy: { select: { id: true, username: true } } },
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { periods } }));
    });
  } catch (error) {
    console.error('Accounting periods error:', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Failed to fetch periods' }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    return await withRole(req, ['admin'], async (payload) => {
      const body = await req.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) return withSecurityHeaders(NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 }));

      const { name, startDate, endDate } = parsed.data;
      const existing = await prisma.accountingPeriod.findFirst({
        where: { startDate: new Date(startDate), isDeleted: false },
      });
      if (existing) return withSecurityHeaders(NextResponse.json({ success: false, error: 'Period already exists' }, { status: 409 }));

      const period = await prisma.accountingPeriod.create({
        data: { name, startDate: new Date(startDate), endDate: new Date(endDate), closedById: payload.userId, tenantId: getTenantId() ?? DEFAULT_TENANT_ID },
      });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'AccountingPeriod',
        entityId: period.id,
        newValue: { name, startDate, endDate },
        ipAddress,
        userAgent,
      });
      return withSecurityHeaders(NextResponse.json({ success: true, data: { period } }, { status: 201 }));
    });
  } catch (error) {
    console.error('Accounting periods error:', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Failed to fetch periods' }, { status: 500 }));
  }
}
