import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));

      const [
        todayInvoices,
        products,
        pendingBookings,
        totalBookings,
        todayTransactions,
        totalMessages,
        recentInvoices,
        recentBookings,
        totalCustomers,
      ] = await Promise.all([
        prisma.invoice.findMany({
          where: { type: 'sale', status: 'confirmed', isDeleted: false, createdAt: { gte: todayStart, lte: todayEnd } },
          select: { total: true, paid: true, paymentMethod: true },
        }),
        prisma.product.findMany({
          where: { isDeleted: false },
          select: { stock: true, costPrice: true, lowStockThreshold: true, available: true },
        }),
        prisma.booking.count({ where: { status: 'pending', isDeleted: false } }),
        prisma.booking.count({ where: { isDeleted: false } }),
        prisma.transaction.findMany({
          where: { isDeleted: false, createdAt: { gte: todayStart, lte: todayEnd } },
          select: { type: true, amount: true },
        }),
        prisma.contactMessage.count({ where: { isDeleted: false } }),
        prisma.invoice.findMany({
          where: { type: 'sale', status: 'confirmed', isDeleted: false },
          select: { id: true, number: true, total: true, paid: true, customerName: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.booking.findMany({
          where: { isDeleted: false },
          select: { id: true, name: true, model: true, issue: true, date: true, time: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.customer.count({ where: { isDeleted: false } }),
      ]);

      const todaySales = todayInvoices.reduce((s, i) => s + Number(i.total), 0);
      const todayPaid = todayInvoices.reduce((s, i) => s + Number(i.paid), 0);
      const cashSales = todayInvoices.filter((i) => i.paymentMethod === 'cash' || !i.paymentMethod).reduce((s, i) => s + Number(i.paid), 0);
      const cardSales = todayInvoices.filter((i) => i.paymentMethod === 'card').reduce((s, i) => s + Number(i.paid), 0);
      const transferSales = todayInvoices.filter((i) => i.paymentMethod === 'transfer').reduce((s, i) => s + Number(i.paid), 0);

      const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold && p.available).length;
      const outOfStockCount = products.filter((p) => p.stock === 0).length;
      const inventoryValue = products.reduce((s, p) => s + Number(p.costPrice || 0) * p.stock, 0);
      const totalProducts = products.length;

      const todayIncome = todayTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const todayExpenses = todayTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          today: {
            sales: Math.round(todaySales * 100) / 100,
            paid: Math.round(todayPaid * 100) / 100,
            invoiceCount: todayInvoices.length,
            cashSales: Math.round(cashSales * 100) / 100,
            cardSales: Math.round(cardSales * 100) / 100,
            transferSales: Math.round(transferSales * 100) / 100,
            income: Math.round(todayIncome * 100) / 100,
            expenses: Math.round(todayExpenses * 100) / 100,
          },
          inventory: {
            totalProducts,
            lowStockCount,
            outOfStockCount,
            inventoryValue: Math.round(inventoryValue * 100) / 100,
          },
          bookings: {
            pending: pendingBookings,
            total: totalBookings,
          },
          customers: {
            total: totalCustomers,
          },
          messages: {
            total: totalMessages,
          },
          recentInvoices: recentInvoices.map((i) => ({
            ...i,
            total: Number(i.total),
            paid: Number(i.paid),
            createdAt: i.createdAt.toISOString(),
          })),
          recentBookings: recentBookings.map((b) => ({
            ...b,
            createdAt: b.createdAt.toISOString(),
          })),
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
