import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const skip = (page - 1) * limit;

  const fromDate = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
  const toDate = to ? new Date(to) : new Date(new Date().setHours(23, 59, 59, 999));

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid date range' }, { status: 400 });
  }

  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: 'confirmed', isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
      select: {
        id: true, number: true, type: true, total: true, discount: true, taxTotal: true,
        subtotal: true, paid: true, paymentMethod: true, notes: true,
        createdById: true, createdAt: true, customerName: true,
        items: { select: { productName: true, quantity: true, total: true, costPrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const manualTxns = await prisma.transaction.findMany({
      where: { isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
      select: { id: true, type: true, amount: true, description: true, createdBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const workOrders = await prisma.workOrder.findMany({
      where: { isDeleted: false, cost: { not: null }, createdAt: { gte: fromDate, lte: toDate } },
      select: { id: true, description: true, cost: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const transactions: Array<{
      id: string; type: string; amount: number; description: string | null;
      referenceNumber: string | null; referenceType: string; referenceId: string;
      category: string | null; paymentMethod: string | null; date: string;
      createdById: string; items: unknown[]; discount: number; tax: number;
    }> = [];

    const typeMap: Record<string, string> = { sale: 'SALE', return: 'RETURN', purchase: 'PURCHASE' };

    for (const inv of invoices) {
      transactions.push({
        id: inv.id,
        type: typeMap[inv.type] || 'SALE',
        amount: Number(inv.total),
        description: `${inv.type === 'sale' ? 'Sale' : inv.type === 'return' ? 'Return' : 'Purchase'} - ${inv.customerName || 'Walk-in'} (${inv.number})`,
        referenceNumber: inv.number,
        referenceType: 'invoice',
        referenceId: inv.id,
        category: null,
        paymentMethod: inv.paymentMethod,
        date: inv.createdAt.toISOString(),
        createdById: inv.createdById,
        items: inv.items,
        discount: Number(inv.discount),
        tax: Number(inv.taxTotal),
      });
    }

    for (const txn of manualTxns) {
      transactions.push({
        id: txn.id,
        type: txn.type === 'income' ? 'INCOME' : 'EXPENSE',
        amount: Number(txn.amount),
        description: txn.description,
        referenceNumber: null,
        referenceType: 'manual_transaction',
        referenceId: txn.id,
        category: null,
        paymentMethod: null,
        date: txn.createdAt.toISOString(),
        createdById: txn.createdBy || '',
        items: [],
        discount: 0,
        tax: 0,
      });
    }

    for (const wo of workOrders) {
      transactions.push({
        id: wo.id,
        type: 'EXPENSE',
        amount: Number(wo.cost),
        description: `Work Order: ${wo.description}`,
        referenceNumber: null,
        referenceType: 'work_order',
        referenceId: wo.id,
        category: 'Labor',
        paymentMethod: null,
        date: wo.createdAt.toISOString(),
        createdById: '',
        items: [],
        discount: 0,
        tax: 0,
      });
    }

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = transactions.length;
    const paged = transactions.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: paged,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Accounting transactions error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
