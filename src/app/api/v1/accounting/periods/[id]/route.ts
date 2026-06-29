import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { logAudit, getClientInfo } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const { action } = body;

      const period = await prisma.accountingPeriod.findFirst({ where: { id, isDeleted: false } });
      if (!period) return NextResponse.json({ success: false, error: 'Period not found' }, { status: 404 });

      const { ipAddress, userAgent } = getClientInfo(req);

      if (action === 'close') {
        if (period.status !== 'open') return NextResponse.json({ success: false, error: 'Period is not open' }, { status: 400 });
        const updated = await prisma.accountingPeriod.update({
          where: { id },
          data: { status: 'closed', closedById: payload.userId, closedAt: new Date() },
        });
        await logAudit({ userId: payload.userId, action: 'close', entity: 'AccountingPeriod', entityId: id, oldValue: { status: period.status }, newValue: { status: 'closed' }, ipAddress, userAgent });
        return NextResponse.json({ success: true, data: { period: updated } });
      }

      if (action === 'reopen') {
        if (period.status !== 'closed') return NextResponse.json({ success: false, error: 'Period is not closed' }, { status: 400 });
        const updated = await prisma.accountingPeriod.update({
          where: { id },
          data: { status: 'open', closedById: null, closedAt: null },
        });
        await logAudit({ userId: payload.userId, action: 'reopen', entity: 'AccountingPeriod', entityId: id, oldValue: { status: period.status }, newValue: { status: 'open' }, ipAddress, userAgent });
        return NextResponse.json({ success: true, data: { period: updated } });
      }

      if (action === 'lock') {
        if (period.status !== 'closed') return NextResponse.json({ success: false, error: 'Period must be closed first' }, { status: 400 });
        const updated = await prisma.accountingPeriod.update({
          where: { id },
          data: { status: 'locked' },
        });
        await logAudit({ userId: payload.userId, action: 'lock', entity: 'AccountingPeriod', entityId: id, oldValue: { status: period.status }, newValue: { status: 'locked' }, ipAddress, userAgent });
        return NextResponse.json({ success: true, data: { period: updated } });
      }

      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin'], async (payload) => {
      const { id } = await params;
      const existing = await prisma.accountingPeriod.findUnique({ where: { id }, select: { name: true, status: true } });
      await prisma.accountingPeriod.update({ where: { id }, data: { isDeleted: true } });
      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({ userId: payload.userId, action: 'delete', entity: 'AccountingPeriod', entityId: id, oldValue: existing ?? undefined, ipAddress, userAgent });
      return NextResponse.json({ success: true });
    });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}
