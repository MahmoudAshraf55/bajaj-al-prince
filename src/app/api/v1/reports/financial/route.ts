import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const reportType = searchParams.get('type') || 'pnl';

      const fromDate = from ? new Date(from) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const toDate = to ? new Date(to) : new Date();

      if (reportType === 'pnl') {
        return await generatePnL(fromDate, toDate);
      } else if (reportType === 'balance') {
        return await generateBalanceSheet(fromDate, toDate);
      } else if (reportType === 'cashflow') {
        return await generateCashFlow(fromDate, toDate);
      }

      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

async function generatePnL(from: Date, to: Date) {
  const [sales, returns, purchaseInvoices, transactions, saleItems, workOrders] = await Promise.all([
    prisma.invoice.findMany({
      where: { type: 'sale', status: 'confirmed', isDeleted: false, createdAt: { gte: from, lte: to } },
      select: { total: true, discount: true, taxTotal: true },
    }),
    prisma.invoice.findMany({
      where: { type: 'return', status: 'confirmed', isDeleted: false, createdAt: { gte: from, lte: to } },
      select: { total: true },
    }),
    prisma.invoice.findMany({
      where: { type: 'purchase', status: 'confirmed', isDeleted: false, createdAt: { gte: from, lte: to } },
      select: { total: true },
    }),
    prisma.transaction.findMany({
      where: { isDeleted: false, createdAt: { gte: from, lte: to } },
      select: { type: true, amount: true },
    }),
    prisma.invoiceItem.findMany({
      where: { invoice: { type: 'sale', status: 'confirmed', isDeleted: false, createdAt: { gte: from, lte: to } }, isDeleted: false },
      select: { costPrice: true, quantity: true, total: true },
    }),
    prisma.workOrder.findMany({
      where: { isDeleted: false, cost: { not: null }, createdAt: { gte: from, lte: to } },
      select: { cost: true },
    }),
  ]);

  const revenue = sales.reduce((s, i) => s + Number(i.total), 0);
  const returnsTotal = returns.reduce((s, i) => s + Number(i.total), 0);
  const netSales = revenue - returnsTotal;
  const cogs = saleItems.reduce((s, i) => s + Number(i.costPrice) * i.quantity, 0);
  const grossProfit = netSales - cogs;
  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const discounts = sales.reduce((s, i) => s + Number(i.discount), 0);
  const taxes = sales.reduce((s, i) => s + Number(i.taxTotal), 0);
  const purchaseTotal = purchaseInvoices.reduce((s, i) => s + Number(i.total), 0);
  const manualIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const manualExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const woCosts = workOrders.reduce((s, w) => s + Number(w.cost), 0);
  const totalExpenses = manualExpenses + woCosts;
  const netProfit = grossProfit + manualIncome - totalExpenses;
  const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  return withSecurityHeaders(NextResponse.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      revenue: Math.round(revenue * 100) / 100,
      returns: Math.round(returnsTotal * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: Math.round(grossMargin * 100) / 100,
      discounts: Math.round(discounts * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      purchases: Math.round(purchaseTotal * 100) / 100,
      otherIncome: Math.round(manualIncome * 100) / 100,
      operatingExpenses: Math.round(totalExpenses * 100) / 100,
      workOrderCosts: Math.round(woCosts * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
    },
  }));
}

async function generateBalanceSheet(from: Date, to: Date) {
  const [products, saleInvoices, purchaseInvoices, manualTxns] = await Promise.all([
    prisma.product.findMany({
      where: { isDeleted: false, available: true },
      select: { costPrice: true, stock: true },
    }),
    prisma.invoice.findMany({
      where: { type: 'sale', status: 'confirmed', isDeleted: false, createdAt: { lte: to } },
      select: { total: true, paid: true },
    }),
    prisma.invoice.findMany({
      where: { type: 'purchase', status: 'confirmed', isDeleted: false, createdAt: { lte: to } },
      select: { total: true, paid: true },
    }),
    prisma.transaction.findMany({
      where: { isDeleted: false, createdAt: { lte: to } },
      select: { type: true, amount: true },
    }),
  ]);

  const inventoryValue = products.reduce((s, p) => s + Number(p.costPrice || 0) * p.stock, 0);
  const totalSales = saleInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = saleInvoices.reduce((s, i) => s + Number(i.paid), 0);
  const accountsReceivable = Math.max(0, totalSales - totalPaid);
  const totalPurchases = purchaseInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPurchasePaid = purchaseInvoices.reduce((s, i) => s + Number(i.paid), 0);
  const accountsPayable = Math.max(0, totalPurchases - totalPurchasePaid);
  const cashIncome = manualTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const cashExpenses = manualTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const cash = totalPaid + cashIncome - cashExpenses;

  const totalAssets = inventoryValue + accountsReceivable + cash;
  const totalLiabilities = accountsPayable;
  const equity = totalAssets - totalLiabilities;

  return withSecurityHeaders(NextResponse.json({
    success: true,
    data: {
      period: { asOf: to.toISOString() },
      assets: {
        cash: Math.round(cash * 100) / 100,
        accountsReceivable: Math.round(accountsReceivable * 100) / 100,
        inventory: Math.round(inventoryValue * 100) / 100,
        total: Math.round(totalAssets * 100) / 100,
      },
      liabilities: {
        accountsPayable: Math.round(accountsPayable * 100) / 100,
        total: Math.round(totalLiabilities * 100) / 100,
      },
      equity: Math.round(equity * 100) / 100,
      totalLiabilitiesAndEquity: Math.round((totalLiabilities + equity) * 100) / 100,
    },
  }));
}

async function generateCashFlow(from: Date, to: Date) {
  const [invoices, manualTxns, purchases] = await Promise.all([
    prisma.invoice.findMany({
      where: { type: 'sale', status: 'confirmed', isDeleted: false, createdAt: { gte: from, lte: to } },
      select: { paid: true, paymentMethod: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { isDeleted: false, createdAt: { gte: from, lte: to } },
      select: { type: true, amount: true, description: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { type: 'purchase', status: 'confirmed', isDeleted: false, createdAt: { gte: from, lte: to } },
      select: { paid: true },
    }),
  ]);

  const cashFromSales = invoices
    .filter((i) => i.paymentMethod === 'cash' || !i.paymentMethod)
    .reduce((s, i) => s + Number(i.paid), 0);
  const cardFromSales = invoices
    .filter((i) => i.paymentMethod === 'card')
    .reduce((s, i) => s + Number(i.paid), 0);
  const transferFromSales = invoices
    .filter((i) => i.paymentMethod === 'transfer')
    .reduce((s, i) => s + Number(i.paid), 0);

  const cashIncome = manualTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const cashExpenses = manualTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const purchasePayments = purchases.reduce((s, p) => s + Number(p.paid), 0);

  const operatingCashFlow = cashFromSales + cardFromSales + transferFromSales + cashIncome - cashExpenses - purchasePayments;

  return withSecurityHeaders(NextResponse.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      operating: {
        cashSales: Math.round(cashFromSales * 100) / 100,
        cardSales: Math.round(cardFromSales * 100) / 100,
        transferSales: Math.round(transferFromSales * 100) / 100,
        otherIncome: Math.round(cashIncome * 100) / 100,
        expenses: Math.round(cashExpenses * 100) / 100,
        purchasePayments: Math.round(purchasePayments * 100) / 100,
        net: Math.round(operatingCashFlow * 100) / 100,
      },
      netCashFlow: Math.round(operatingCashFlow * 100) / 100,
    },
  }));
}
