import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const fromDate = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
  const toDate = to ? new Date(to) : new Date(new Date().setHours(23, 59, 59, 999));

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid date range' }, { status: 400 });
  }

  try {
    const [sales, returns, purchaseInvoices, manualTxns, workOrders, saleItems, products] = await Promise.all([
      prisma.invoice.findMany({
        where: { type: 'sale', status: 'confirmed', isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
        select: { id: true, total: true, discount: true, taxTotal: true, paymentMethod: true, createdAt: true, items: { select: { productId: true, quantity: true, costPrice: true, product: { select: { category: true } } } } },
      }),
      prisma.invoice.findMany({
        where: { type: 'return', status: 'confirmed', isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
        select: { id: true, total: true, createdAt: true },
      }),
      prisma.invoice.findMany({
        where: { type: 'purchase', status: 'confirmed', isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
        select: { total: true },
      }),
      prisma.transaction.findMany({
        where: { isDeleted: false, createdAt: { gte: fromDate, lte: toDate } },
        select: { type: true, amount: true, description: true, createdAt: true },
      }),
      prisma.workOrder.findMany({
        where: { isDeleted: false, cost: { not: null }, createdAt: { gte: fromDate, lte: toDate } },
        select: { cost: true, description: true, createdAt: true },
      }),
      prisma.invoiceItem.findMany({
        where: { invoice: { type: 'sale', status: 'confirmed', isDeleted: false, createdAt: { gte: fromDate, lte: toDate } }, isDeleted: false },
        select: { costPrice: true, quantity: true, total: true, productId: true, invoice: { select: { discount: true, taxTotal: true, paymentMethod: true } }, product: { select: { category: true } } },
      }),
      prisma.product.findMany({ where: { isDeleted: false }, select: { id: true, category: true } }),
    ]);

    const revenue = sales.reduce((sum: number, inv: typeof sales[0]) => sum + Number(inv.total), 0);
    const returnsTotal = returns.reduce((sum: number, inv: typeof returns[0]) => sum + Number(inv.total), 0);
    const netSales = revenue - returnsTotal;

    const cogs = saleItems.reduce((sum: number, item: typeof saleItems[0]) => sum + Number(item.costPrice) * item.quantity, 0);
    const grossProfit = netSales - cogs;
    const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    const purchaseTotal = purchaseInvoices.reduce((sum: number, inv: typeof purchaseInvoices[0]) => sum + Number(inv.total), 0);
    const manualExpenses = manualTxns.filter((t: typeof manualTxns[0]) => t.type === 'expense').reduce((sum: number, t: typeof manualTxns[0]) => sum + Number(t.amount), 0);
    const manualIncome = manualTxns.filter((t: typeof manualTxns[0]) => t.type === 'income').reduce((sum: number, t: typeof manualTxns[0]) => sum + Number(t.amount), 0);
    const workOrderCosts = workOrders.reduce((sum: number, wo: typeof workOrders[0]) => sum + Number(wo.cost), 0);
    const expenses = purchaseTotal + manualExpenses + workOrderCosts;

    const discounts = sales.reduce((sum: number, inv: typeof sales[0]) => sum + Number(inv.discount), 0);
    const taxes = sales.reduce((sum: number, inv: typeof sales[0]) => sum + Number(inv.taxTotal), 0);

    const netProfit = grossProfit + manualIncome - expenses - discounts;
    const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

    const pmMap = new Map<string, { amount: number; count: number }>();
    for (const inv of sales) {
      const method = inv.paymentMethod || 'unknown';
      const entry = pmMap.get(method) || { amount: 0, count: 0 };
      entry.amount += Number(inv.total);
      entry.count += 1;
      pmMap.set(method, entry);
    }
    const byPaymentMethod = Array.from(pmMap.entries()).map(([method, data]) => ({ method, ...data }));

    const productCat = new Map(products.map((p: typeof products[0]) => [p.id, p.category]));
    const catMap = new Map<string, { revenue: number; cogs: number }>();
    for (const item of saleItems) {
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

    return NextResponse.json({
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
        invoiceCount: sales.length,
      },
    });
  } catch (err) {
    console.error('Accounting summary error:', err);
    return NextResponse.json({ success: false, error: 'Failed to generate accounting summary' }, { status: 500 });
  }
}
