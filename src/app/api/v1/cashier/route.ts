import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().refine(
    (n) => {
      const fixed = n.toFixed(10);
      const trimmed = fixed.replace(/\.?0+$/, '');
      const decimal = trimmed.split('.')[1];
      return !decimal || decimal.length <= 2;
    },
    { message: 'Amount must have at most 2 decimal places' }
  ),
  description: sanitizedString(z.string().max(500)).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'staff']);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.transaction.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return limit.response!;

  try {
    const payload = await requireRole(req, ['admin', 'staff']);
    const body = await req.json();
    const data = transactionSchema.parse(body);
    const transaction = await prisma.transaction.create({
      data: { ...data, createdBy: payload.userId },
    });
    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: payload.userId,
      action: 'payment',
      entity: 'Transaction',
      entityId: transaction.id,
      newValue: { ...data, createdBy: payload.userId } as Record<string, unknown>,
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ success: true, data: { transaction: { ...transaction, amount: Number(transaction.amount) } } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
