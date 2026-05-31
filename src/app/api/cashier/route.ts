import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const transactions = await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Invalid token')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = transactionSchema.parse(body);
    const transaction = await prisma.transaction.create({ data });
    return NextResponse.json({ success: true, transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: (error as z.ZodError).issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
