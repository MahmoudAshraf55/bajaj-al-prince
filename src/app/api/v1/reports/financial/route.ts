import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { AccountingService } from '@/services/AccountingService';
import { ACCOUNT_CODES } from '@/constants/accounting';

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
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}

async function generatePnL(from: Date, to: Date) {
  const result = await prisma.$transaction(async (tx) => {
    const incomeStatement = await AccountingService.getIncomeStatement(tx, from, to);

    const purchaseEntries = await tx.journalEntry.findMany({
      where: { type: 'PURCHASE', isDeleted: false, date: { gte: from, lte: to } },
      select: { amount: true },
    });
    const incomeEntries = await tx.journalEntry.findMany({
      where: { type: 'INCOME', isDeleted: false, date: { gte: from, lte: to } },
      select: { amount: true },
    });

    return { incomeStatement, purchaseEntries, incomeEntries };
  });

  const revenue = result.incomeStatement.totalRevenue;
  const netSales = revenue;
  const cogs = result.incomeStatement.expenses.find((e) => e.code === '5100')?.balance || 0;
  const grossProfit = netSales - cogs;
  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const purchaseTotal = result.purchaseEntries.reduce((s, e) => s + Number(e.amount), 0);
  const manualIncome = result.incomeEntries.reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = result.incomeStatement.totalExpenses;
  const netProfit = result.incomeStatement.netProfit;
  const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  return withSecurityHeaders(NextResponse.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      revenue: Math.round(revenue * 100) / 100,
      returns: 0,
      netSales: Math.round(netSales * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: Math.round(grossMargin * 100) / 100,
      discounts: 0,
      taxes: 0,
      purchases: Math.round(purchaseTotal * 100) / 100,
      otherIncome: Math.round(manualIncome * 100) / 100,
      operatingExpenses: Math.round(totalExpenses * 100) / 100,
      workOrderCosts: 0,
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
    },
  }));
}

async function generateBalanceSheet(from: Date, to: Date) {
  const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;

  const result = await prisma.$transaction(async (tx) => {
    const balanceSheet = await AccountingService.getBalanceSheet(tx, to);

    const products = await tx.product.findMany({
      where: { isDeleted: false, available: true, tenantId },
      select: { costPrice: true, stock: true },
    });
    const saleInvoices = await tx.invoice.findMany({
      where: { type: 'sale', status: 'confirmed', isDeleted: false, tenantId },
      select: { total: true, paid: true },
    });
    const purchaseInvoices = await tx.invoice.findMany({
      where: { type: 'purchase', status: 'confirmed', isDeleted: false, tenantId },
      select: { total: true, paid: true },
    });
    const cashJeLines = await tx.journalEntryLine.findMany({
      where: {
        journalEntry: { type: { in: ['SALE', 'INCOME', 'EXPENSE'] }, isDeleted: false, date: { lte: to }, tenantId },
        account: { code: ACCOUNT_CODES.CASH },
        isDeleted: false,
      },
      select: { debit: true, credit: true },
    });

    return { balanceSheet, products, saleInvoices, purchaseInvoices, cashJeLines };
  });

  const inventoryValue = result.products.reduce((s, p) => s + Number(p.costPrice || 0) * p.stock, 0);
  const totalSales = result.saleInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = result.saleInvoices.reduce((s, i) => s + Number(i.paid), 0);
  const accountsReceivable = Math.max(0, totalSales - totalPaid);
  const totalPurchases = result.purchaseInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPurchasePaid = result.purchaseInvoices.reduce((s, i) => s + Number(i.paid), 0);
  const accountsPayable = Math.max(0, totalPurchases - totalPurchasePaid);
  const cashBalance = result.cashJeLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);

  const cash = result.balanceSheet.assets.find((a) => a.code === '1101')?.balance || cashBalance;
  const totalAssets = (result.balanceSheet.assets.find((a) => a.code === '1101')?.balance || 0) +
    accountsReceivable + inventoryValue;
  const totalLiabilities = accountsPayable;
  const equity = result.balanceSheet.equity.reduce((s, e) => s + e.balance, 0);

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
  const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;

  const [saleEntries, expenseEntries, incomeEntries, purchaseEntries] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { type: 'SALE', isDeleted: false, date: { gte: from, lte: to }, tenantId },
      select: { amount: true, paymentMethod: true },
    }),
    prisma.journalEntry.findMany({
      where: { type: 'EXPENSE', isDeleted: false, date: { gte: from, lte: to }, tenantId },
      select: { amount: true },
    }),
    prisma.journalEntry.findMany({
      where: { type: 'INCOME', isDeleted: false, date: { gte: from, lte: to }, tenantId },
      select: { amount: true },
    }),
    prisma.journalEntry.findMany({
      where: { type: 'PURCHASE', isDeleted: false, date: { gte: from, lte: to }, tenantId },
      select: { amount: true },
    }),
  ]);

  const cashFromSales = saleEntries
    .filter((e) => e.paymentMethod === 'cash' || !e.paymentMethod)
    .reduce((s, e) => s + Number(e.amount), 0);
  const cardFromSales = saleEntries
    .filter((e) => e.paymentMethod === 'card')
    .reduce((s, e) => s + Number(e.amount), 0);
  const transferFromSales = saleEntries
    .filter((e) => e.paymentMethod === 'transfer')
    .reduce((s, e) => s + Number(e.amount), 0);

  const cashIncome = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);
  const cashExpenses = expenseEntries.reduce((s, e) => s + Number(e.amount), 0);
  const purchasePayments = purchaseEntries.reduce((s, e) => s + Number(e.amount), 0);

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
