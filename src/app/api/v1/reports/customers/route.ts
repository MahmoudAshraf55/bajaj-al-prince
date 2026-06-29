import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { exportToExcel } from '@/lib/export-excel';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const format = searchParams.get('format') || 'json';
      const reportType = searchParams.get('type') || 'top';

      const fromDate = from ? new Date(from) : new Date(new Date().setMonth(new Date().getMonth() - 3));
      const toDate = to ? new Date(to) : new Date();

      const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        include: {
          invoices: {
            where: { status: 'confirmed', isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
            select: { total: true, type: true, createdAt: true },
          },
          bookings: {
            where: { isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
            select: { id: true, status: true, issue: true, createdAt: true },
          },
          vehicles: { select: { id: true, make: true, model: true } },
        },
      });

      const customerData = customers.map((c) => {
        const salesInvoices = c.invoices.filter((i) => i.type === 'sale');
        const totalSpent = salesInvoices.reduce((s, i) => s + Number(i.total), 0);
        const invoiceCount = salesInvoices.length;
        const lastPurchase = salesInvoices.length > 0
          ? salesInvoices.reduce((max, i) => i.createdAt > max ? i.createdAt : max, salesInvoices[0].createdAt)
          : null;
        const bookingCount = c.bookings.length;
        const completedBookings = c.bookings.filter((b) => b.status === 'completed').length;

        return {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          totalSpent: Math.round(totalSpent * 100) / 100,
          invoiceCount,
          bookingCount,
          completedBookings,
          vehiclesCount: c.vehicles.length,
          lastPurchase: lastPurchase ? new Date(lastPurchase).toISOString() : null,
        };
      });

      if (reportType === 'top') {
        const top = customerData
          .filter((c) => c.totalSpent > 0)
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 20);

        if (format === 'excel') {
          const rows = top.map((c, i) => ({
            'Rank': i + 1,
            'Name': c.name,
            'Phone': c.phone,
            'Total Spent': c.totalSpent,
            'Invoices': c.invoiceCount,
            'Bookings': c.bookingCount,
            'Completed Bookings': c.completedBookings,
            'Vehicles': c.vehiclesCount,
            'Last Purchase': c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString() : '—',
          }));
          const buffer = exportToExcel(rows, 'top-customers', 'Top Customers');
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': 'attachment; filename="top-customers.xlsx"',
            },
          });
        }

        return withSecurityHeaders(NextResponse.json({
          success: true,
          data: {
            period: { from: fromDate.toISOString(), to: toDate.toISOString() },
            count: top.length,
            customers: top,
          },
        }));
      }

      // Activity report
      if (format === 'excel') {
        const rows = customerData.map((c) => ({
          'Name': c.name,
          'Phone': c.phone,
          'Total Spent': c.totalSpent,
          'Invoices': c.invoiceCount,
          'Bookings': c.bookingCount,
          'Completed Bookings': c.completedBookings,
          'Vehicles': c.vehiclesCount,
          'Last Purchase': c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString() : '—',
        }));
        const buffer = exportToExcel(rows, 'customer-activity', 'Customer Activity');
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="customer-activity.xlsx"',
          },
        });
      }

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          period: { from: fromDate.toISOString(), to: toDate.toISOString() },
          count: customerData.length,
          customers: customerData.sort((a, b) => b.totalSpent - a.totalSpent),
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
