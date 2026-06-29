import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { createDoubleEntry } from '@/lib/journal';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const manualEntrySchema = z.object({
  type: z.enum(['SALE', 'RETURN', 'PURCHASE', 'EXPENSE', 'INCOME', 'STOCK_ADJUSTMENT']),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  referenceType: z.string().max(100).optional(),
  referenceId: z.string().uuid().optional(),
  referenceNumber: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  paymentMethod: z.string().max(50).optional(),
  date: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
      const skip = (page - 1) * limit;
      const type = searchParams.get('type');
      const from = searchParams.get('from');
      const to = searchParams.get('to');

      const where: Prisma.JournalEntryWhereInput = {};
      if (type) where.type = type as Prisma.EnumJournalEntryTypeFilter;
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
      }

      const [entries, total] = await Promise.all([
        prisma.journalEntry.findMany({
          where,
          include: {
            lines: {
              include: { account: { select: { id: true, code: true, name: true, type: true } } },
              orderBy: { debit: 'desc' },
            },
            createdBy: { select: { id: true, username: true } },
          },
          skip,
          take: limit,
          orderBy: { date: 'desc' },
        }),
        prisma.journalEntry.count({ where }),
      ]);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          entries,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin'], async (payload) => {
      const body = await req.json();
      const data = manualEntrySchema.parse(body);

      const result = await createDoubleEntry(prisma, {
        type: data.type,
        amount: data.amount,
        description: data.description,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        referenceNumber: data.referenceNumber,
        category: data.category,
        paymentMethod: data.paymentMethod,
        createdById: payload.userId,
        date: data.date ? new Date(data.date) : undefined,
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'create',
        entity: 'JournalEntry',
        entityId: result.id,
        newValue: { type: data.type, amount: data.amount, description: data.description } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true, data: { id: result.id, amount: result.amount } }, { status: 201 }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
