import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'staff']);
    const periods = await prisma.accountingPeriod.findMany({
      where: { isDeleted: false },
      orderBy: { startDate: 'desc' },
      include: { closedBy: { select: { id: true, username: true } } },
    });
    return NextResponse.json({ success: true, data: { periods } });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await requireRole(req, ['admin']);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const { name, startDate, endDate } = parsed.data;
    const existing = await prisma.accountingPeriod.findFirst({
      where: { startDate: new Date(startDate), isDeleted: false },
    });
    if (existing) return NextResponse.json({ success: false, error: 'Period already exists' }, { status: 409 });

    const period = await prisma.accountingPeriod.create({
      data: { name, startDate: new Date(startDate), endDate: new Date(endDate), closedById: payload.userId },
    });
    return NextResponse.json({ success: true, data: { period } }, { status: 201 });
  } catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
}
