import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await requireRole(req, ['admin']);
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const period = await prisma.accountingPeriod.findFirst({ where: { id, isDeleted: false } });
    if (!period) return NextResponse.json({ success: false, error: 'Period not found' }, { status: 404 });

    if (action === 'close') {
      if (period.status !== 'open') return NextResponse.json({ success: false, error: 'Period is not open' }, { status: 400 });
      const updated = await prisma.accountingPeriod.update({
        where: { id },
        data: { status: 'closed', closedById: payload.userId, closedAt: new Date() },
      });
      return NextResponse.json({ success: true, data: { period: updated } });
    }

    if (action === 'reopen') {
      if (period.status !== 'closed') return NextResponse.json({ success: false, error: 'Period is not closed' }, { status: 400 });
      const updated = await prisma.accountingPeriod.update({
        where: { id },
        data: { status: 'open', closedById: null, closedAt: null },
      });
      return NextResponse.json({ success: true, data: { period: updated } });
    }

    if (action === 'lock') {
      if (period.status !== 'closed') return NextResponse.json({ success: false, error: 'Period must be closed first' }, { status: 400 });
      const updated = await prisma.accountingPeriod.update({
        where: { id },
        data: { status: 'locked' },
      });
      return NextResponse.json({ success: true, data: { period: updated } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await params;
    await prisma.accountingPeriod.update({ where: { id }, data: { isDeleted: true } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}
