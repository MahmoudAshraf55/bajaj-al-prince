import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { createDoubleEntry } from '@/lib/journal';

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
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.transaction.count(),
      ]);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const body = await req.json();
      const data = transactionSchema.parse(body);
      const transaction = await prisma.transaction.create({
        data: { ...data, createdById: payload.userId },
      });
      const jeType = data.type === 'income' ? 'INCOME' as const : 'EXPENSE' as const;
      await createDoubleEntry(prisma, {
        type: jeType,
        amount: data.amount,
        description: data.description || `${data.type === 'income' ? 'Income' : 'Expense'} transaction`,
        referenceType: 'transaction',
        referenceId: transaction.id,
        createdById: payload.userId,
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
      return withSecurityHeaders(NextResponse.json({ success: true, data: { transaction: { ...transaction, amount: Number(transaction.amount) } } }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
