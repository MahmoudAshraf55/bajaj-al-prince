import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { exportToExcel } from '@/lib/export-excel';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        include: {
          _count: { select: { invoices: true, bookings: true, vehicles: true } },
        },
        orderBy: { name: 'asc' },
      });

      const rows = customers.map((c) => ({
        'Name': c.name,
        'Phone': c.phone || '—',
        'Email': c.email || '—',
        'Address': c.address || '—',
        'Vehicles Count': c._count.vehicles || 0,
        'Invoices Count': c._count.invoices,
        'Bookings Count': c._count.bookings,
        'Created': new Date(c.createdAt).toLocaleDateString(),
      }));

      const buffer = exportToExcel(rows, 'customers', 'Customers');

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="customers.xlsx"',
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
