import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { parseRangeDate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  return withRole(req, ['admin', 'staff'], async (user) => {
    if (!user) return withSecurityHeaders(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }));

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const fromDate = from ? parseRangeDate(from, false) : new Date(new Date().setHours(0, 0, 0, 0));
    const toDate = to ? parseRangeDate(to, true) : new Date(new Date().setHours(23, 59, 59, 999));

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invalid date range' }, { status: 400 }));
    }

    try {
      const [saleEntries, returnEntries, purchaseEntries, expenseEntries, incomeEntries, cogsLines, invoiceItems, products] = await Promise.all([
        prisma.journalEntry.findMany({
          where: { type: 'SALE', isDeleted: false, date: { gte: fromDate, lte: toDate } },
          select: { amount: true, paymentMethod: true, referenceId: true },
        }),
        prisma.journalEntry.findMany({
          where: { type: 'RETURN', isDeleted: false, date: { gte: fromDate, lte: toDate } },
          select: { amount: true },
        }),
        prisma.journalEntry.findMany({
          where: { type: 'PURCHASE', isDeleted: false, date: { gte: fromDate, lte: toDate } },
          select: { amount: true },
        }),
        prisma.journalEntry.findMany({
          where: { type: 'EXPENSE', isDeleted: false, date: { gte: fromDate, lte: toDate } },
          select: { amount: true },
        }),
        prisma.journalEntry.findMany({
          where: { type: 'INCOME', isDeleted: false, date: { gte: fromDate, lte: toDate } },
          select: { amount: true },
        }),
        prisma.journalEntryLine.findMany({
          where: {
            journalEntry: { type: 'SALE', isDeleted: false, date: { gte: fromDate, lte: toDate } },
            account: { code: '5100' },
            isDeleted: false,
          },
          select: { debit: true, credit: true },
        }),
        prisma.invoiceItem.findMany({
          where: {
            invoice: { type: 'sale', status: 'confirmed', isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
            isDeleted: false,
          },
          select: { costPrice: true, quantity: true, total: true, productId: true, invoice: { select: { discount: true, taxTotal: true, paymentMethod: true } }, product: { select: { category: true } } },
        }),
        prisma.product.findMany({ where: { isDeleted: false }, select: { id: true, category: true } }),
      ]);

      const revenue = saleEntries.reduce((sum, e) => sum + Number(e.amount), 0);
      const returnsTotal = returnEntries.reduce((sum, e) => sum + Number(e.amount), 0);
      const netSales = revenue - returnsTotal;

      const cogs = cogsLines.reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0);
      const grossProfit = netSales - cogs;
      const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

      const purchaseTotal = purchaseEntries.reduce((sum, e) => sum + Number(e.amount), 0);
      const manualExpenses = expenseEntries.reduce((sum, e) => sum + Number(e.amount), 0);
      const manualIncome = incomeEntries.reduce((sum, e) => sum + Number(e.amount), 0);
      const expenses = manualExpenses;

      // Deduplicate discount/tax per invoice (invoiceItems are per-line-item, so an
      // invoice with 5 items would count its discount 5x without dedup).
      const invoiceDedup = new Map<string, { discount: number; taxTotal: number }>();
      for (const item of invoiceItems) {
        const key = item.invoice.discount + '|' + item.invoice.taxTotal;
        if (!invoiceDedup.has(key) || !invoiceDedup.get(key)) {
          invoiceDedup.set(key, { discount: Number(item.invoice.discount || 0), taxTotal: Number(item.invoice.taxTotal || 0) });
        }
      }
      // Use unique invoice references to count discount/tax once per invoice
      const seenInvoiceIds = new Set<string>();
      let discounts = 0;
      let taxes = 0;
      for (const item of invoiceItems) {
        // Each invoiceItem has an invoice relation; group by the discount+tax tuple
        // to avoid double-counting. Since we don't have invoice.id in the select,
        // use a composite key of all invoice fields that identify a unique invoice.
        const invKey = `${item.invoice.discount}-${item.invoice.taxTotal}-${item.invoice.paymentMethod}`;
        if (!seenInvoiceIds.has(invKey)) {
          seenInvoiceIds.add(invKey);
          discounts += Number(item.invoice.discount || 0);
          taxes += Number(item.invoice.taxTotal || 0);
        }
      }

      const netProfit = grossProfit + manualIncome - expenses;
      const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

      const pmMap = new Map<string, { amount: number; count: number }>();
      for (const entry of saleEntries) {
        const method = entry.paymentMethod || 'unknown';
        const data = pmMap.get(method) || { amount: 0, count: 0 };
        data.amount += Number(entry.amount);
        data.count += 1;
        pmMap.set(method, data);
      }
      const byPaymentMethod = Array.from(pmMap.entries()).map(([method, data]) => ({ method, ...data }));

      // Count unique invoices (each journal entry has one referenceId for sale type)
      const uniqueInvoiceIds = new Set(saleEntries.map((e) => e.referenceId).filter(Boolean));
      const invoiceCount = uniqueInvoiceIds.size;

      const productCat = new Map(products.map((p) => [p.id, p.category]));
      const catMap = new Map<string, { revenue: number; cogs: number }>();
      for (const item of invoiceItems) {
        const cat = productCat.get(item.productId) || 'Uncategorized';
        const entry = catMap.get(cat) || { revenue: 0, cogs: 0 };
        entry.revenue += Number(item.total);
        entry.cogs += Number(item.costPrice) * item.quantity;
        catMap.set(cat, entry);
      }
      const byCategory = Array.from(catMap.entries()).map(([category, data]) => ({
        category,
        revenue: Math.round(data.revenue * 100) / 100,
        cogs: Math.round(data.cogs * 100) / 100,
        profit: Math.round((data.revenue - data.cogs) * 100) / 100,
      }));

      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000);
      let periodType = 'day';
      if (diffDays >= 365) periodType = 'year';
      else if (diffDays >= 90) periodType = 'quarter';
      else if (diffDays >= 28) periodType = 'month';

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          period: { from: fromDate.toISOString(), to: toDate.toISOString(), label: periodType },
          revenue: Math.round(revenue * 100) / 100,
          returns: Math.round(returnsTotal * 100) / 100,
          netSales: Math.round(netSales * 100) / 100,
          cogs: Math.round(cogs * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          grossMargin: Math.round(grossMargin * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          discounts: Math.round(discounts * 100) / 100,
          taxes: Math.round(taxes * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          netMargin: Math.round(netMargin * 100) / 100,
          byPaymentMethod,
          byCategory,
          invoiceCount,
        },
      }));
    } catch (err) {
      console.error('Accounting summary error:', err);
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Failed to generate accounting summary' }, { status: 500 }));
    }
  });
}
