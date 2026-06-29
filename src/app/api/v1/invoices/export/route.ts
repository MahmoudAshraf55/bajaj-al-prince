import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { exportToExcel } from '@/lib/export-excel';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const type = searchParams.get('type');

      const where: Record<string, unknown> = { isDeleted: false };
      if (type) where.type = type;
      if (from || to) {
        where.createdAt = {};
        if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          items: { select: { productName: true, quantity: true, unitPrice: true, total: true } },
          payments: { select: { method: true, amount: true } },
          createdBy: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const rows = invoices.map((inv) => {
        const paymentSummary = inv.payments.length > 0
          ? inv.payments.map((p) => `${p.method}: ${Number(p.amount).toFixed(2)}`).join(', ')
          : inv.paymentMethod || '—';

        return {
          'Invoice Number': inv.number,
          'Type': inv.type,
          'Status': inv.status,
          'Customer': inv.customerName || '—',
          'Subtotal': Number(inv.subtotal),
          'Tax': Number(inv.taxTotal),
          'Discount': Number(inv.discount),
          'Total': Number(inv.total),
          'Paid': Number(inv.paid),
          'Change': Number(inv.change),
          'Payment Method(s)': paymentSummary,
          'Items Count': inv.items.length,
          'Created By': inv.createdBy.username,
          'Date': new Date(inv.createdAt).toLocaleString(),
        };
      });

      const buffer = exportToExcel(rows, 'invoices', 'Invoices');

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="invoices.xlsx"',
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
