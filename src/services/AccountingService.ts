import type { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { ACCOUNT_CODES } from '@/constants/accounting';

interface JournalLine {
  accountId?: string;
  debit: number | Decimal;
  credit: number | Decimal;
}

interface JournalLineWithAccount extends JournalLine {
  accountId: string;
}

type WhereClause = Record<string, unknown> & { createdAt?: { gte?: Date; lte?: Date } };

const ACCOUNT_NAMES: Record<string, { name: string; nameAr: string; type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }> = {
  // Assets
  [ACCOUNT_CODES.CASH]: { name: 'Cash', nameAr: 'النقدية', type: 'asset' },
  [ACCOUNT_CODES.BANK]: { name: 'Bank', nameAr: 'البنك', type: 'asset' },
  [ACCOUNT_CODES.ACCOUNTS_RECEIVABLE]: { name: 'Accounts Receivable', nameAr: 'حسابات مدينة', type: 'asset' },
  [ACCOUNT_CODES.INVENTORY]: { name: 'Inventory', nameAr: 'المخزون', type: 'asset' },
  [ACCOUNT_CODES.PREPAID_EXPENSES]: { name: 'Prepaid Expenses', nameAr: 'مصروفات مدفوعة مقدماً', type: 'asset' },
  [ACCOUNT_CODES.ACCRUED_REVENUE]: { name: 'Accrued Revenue', nameAr: 'إيرادات مستحقة', type: 'asset' },
  [ACCOUNT_CODES.FIXED_ASSETS]: { name: 'Fixed Assets', nameAr: 'الأصول الثابتة', type: 'asset' },
  [ACCOUNT_CODES.ACCUMULATED_DEPRECIATION]: { name: 'Accumulated Depreciation', nameAr: 'مجمع الإهلاك', type: 'asset' },
  // Liabilities
  [ACCOUNT_CODES.ACCOUNTS_PAYABLE]: { name: 'Accounts Payable', nameAr: 'حسابات دائنة', type: 'liability' },
  [ACCOUNT_CODES.TAXES_PAYABLE]: { name: 'Taxes Payable', nameAr: 'ضرائب مستحقة', type: 'liability' },
  [ACCOUNT_CODES.ACCRUED_EXPENSES]: { name: 'Accrued Expenses', nameAr: 'مصروفات مستحقة', type: 'liability' },
  [ACCOUNT_CODES.SHORT_TERM_LOANS]: { name: 'Short Term Loans', nameAr: 'قروض قصيرة الأجل', type: 'liability' },
  [ACCOUNT_CODES.LONG_TERM_LOANS]: { name: 'Long Term Loans', nameAr: 'قروض طويلة الأجل', type: 'liability' },
  // Equity
  [ACCOUNT_CODES.OWNER_CAPITAL]: { name: 'Owner Capital', nameAr: 'رأس المال', type: 'equity' },
  [ACCOUNT_CODES.RETAINED_EARNINGS]: { name: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', type: 'equity' },
  [ACCOUNT_CODES.DRAWINGS]: { name: 'Drawings', nameAr: 'السحوبات الشخصية', type: 'equity' },
  // Revenue
  [ACCOUNT_CODES.SALES_REVENUE]: { name: 'Sales Revenue', nameAr: 'إيرادات المبيعات', type: 'revenue' },
  [ACCOUNT_CODES.PARTS_SALES]: { name: 'Parts Sales', nameAr: 'مبيعات قطع الغيار', type: 'revenue' },
  [ACCOUNT_CODES.SERVICE_REVENUE]: { name: 'Service Revenue', nameAr: 'إيرادات الخدمات', type: 'revenue' },
  [ACCOUNT_CODES.OTHER_REVENUE]: { name: 'Other Revenue', nameAr: 'إيرادات أخرى', type: 'revenue' },
  // Expenses
  [ACCOUNT_CODES.COGS]: { name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', type: 'expense' },
  [ACCOUNT_CODES.RENT_EXPENSE]: { name: 'Rent Expense', nameAr: 'مصروف الإيجار', type: 'expense' },
  [ACCOUNT_CODES.SALARIES_EXPENSE]: { name: 'Salaries Expense', nameAr: 'مصروف الرواتب', type: 'expense' },
  [ACCOUNT_CODES.UTILITIES_EXPENSE]: { name: 'Utilities Expense', nameAr: 'مصروف المرافق', type: 'expense' },
  [ACCOUNT_CODES.MARKETING_EXPENSE]: { name: 'Marketing Expense', nameAr: 'مصروف التسويق', type: 'expense' },
  [ACCOUNT_CODES.OPERATING_EXPENSES]: { name: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', type: 'expense' },
  [ACCOUNT_CODES.OTHER_EXPENSES]: { name: 'Other Expenses', nameAr: 'مصروفات أخرى', type: 'expense' },
  [ACCOUNT_CODES.DEPRECIATION_EXPENSE]: { name: 'Depreciation Expense', nameAr: 'مصروف الإهلاك', type: 'expense' },
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class AccountingService {
  static async getAccountId(tx: Tx, code: string, tenantId: string): Promise<string> {
    let acct = await tx.account.findFirst({
      where: { code, OR: [{ tenantId }, { tenantId: DEFAULT_TENANT_ID }] },
      orderBy: { tenantId: 'desc' },
      select: { id: true },
    });

    if (!acct) {
      const info = ACCOUNT_NAMES[code];
      if (!info) throw new Error(`Account code ${code} not found and no fallback info`);
      acct = await tx.account.create({
        data: { code, ...info, tenantId },
        select: { id: true },
      });
    }

    return acct.id;
  }

  static async getAccountBalance(tx: Tx, accountId: string, asOfDate?: Date): Promise<number> {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      select: { type: true },
    });

    if (!account) throw new Error(`Account not found: ${accountId}`);

    const where: WhereClause = { accountId };
    if (asOfDate) {
      where.createdAt = { lte: asOfDate };
    }

    const journalLines = await tx.journalEntryLine.findMany({
      where,
      select: { debit: true, credit: true },
    });

    const totalDebit = journalLines.reduce((sum: number, line: JournalLine) => sum + Number(line.debit), 0);
    const totalCredit = journalLines.reduce((sum: number, line: JournalLine) => sum + Number(line.credit), 0);

    // For asset and expense accounts, debit increases balance
    // For liability, equity, and revenue accounts, credit increases balance
    if (account.type === 'asset' || account.type === 'expense') {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  }

  static async getTrialBalance(tx: Tx, asOfDate?: Date): Promise<{
    accounts: Array<{ code: string; name: string; nameAr: string; debit: number; credit: number }>;
    totalDebit: number;
    totalCredit: number;
  }> {
    const accounts = await tx.account.findMany({
      where: { isDeleted: false },
      select: { id: true, code: true, name: true, nameAr: true, type: true },
    });

    const where: WhereClause = {};
    if (asOfDate) {
      where.createdAt = { lte: asOfDate };
    }

    const journalLines = await tx.journalEntryLine.findMany({
      where,
      select: { accountId: true, debit: true, credit: true },
    });

    const accountBalances = new Map<string, { debit: number; credit: number }>();
    journalLines.forEach((line: JournalLineWithAccount) => {
      const current = accountBalances.get(line.accountId) || { debit: 0, credit: 0 };
      current.debit += Number(line.debit);
      current.credit += Number(line.credit);
      accountBalances.set(line.accountId, current);
    });

    const result = accounts.map((acct) => {
      const balances = accountBalances.get(acct.id) || { debit: 0, credit: 0 };
      let debit = 0;
      let credit = 0;

      if (acct.type === 'asset' || acct.type === 'expense') {
        const balance = balances.debit - balances.credit;
        if (balance > 0) debit = balance;
        else credit = Math.abs(balance);
      } else {
        const balance = balances.credit - balances.debit;
        if (balance > 0) credit = balance;
        else debit = Math.abs(balance);
      }

      return {
        code: acct.code,
        name: acct.name,
        nameAr: acct.nameAr || '',
        debit,
        credit,
      };
    });

    const totalDebit = result.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredit = result.reduce((sum, acc) => sum + acc.credit, 0);

    return { accounts: result, totalDebit, totalCredit };
  }

  static async getBalanceSheet(tx: Tx, asOfDate?: Date): Promise<{
    assets: Array<{ code: string; name: string; nameAr: string; balance: number }>;
    liabilities: Array<{ code: string; name: string; nameAr: string; balance: number }>;
    equity: Array<{ code: string; name: string; nameAr: string; balance: number }>;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }> {
    const accounts = await tx.account.findMany({
      where: { isDeleted: false },
      select: { id: true, code: true, name: true, nameAr: true, type: true },
    });

    const where: WhereClause = {};
    if (asOfDate) {
      where.createdAt = { lte: asOfDate };
    }

    const journalLines = await tx.journalEntryLine.findMany({
      where,
      select: { accountId: true, debit: true, credit: true },
    });

    const accountBalances = new Map<string, { debit: number; credit: number }>();
    journalLines.forEach((line: JournalLineWithAccount) => {
      const current = accountBalances.get(line.accountId) || { debit: 0, credit: 0 };
      current.debit += Number(line.debit);
      current.credit += Number(line.credit);
      accountBalances.set(line.accountId, current);
    });

    const assets: Array<{ code: string; name: string; nameAr: string; balance: number }> = [];
    const liabilities: Array<{ code: string; name: string; nameAr: string; balance: number }> = [];
    const equity: Array<{ code: string; name: string; nameAr: string; balance: number }> = [];

    accounts.forEach((acct) => {
      const balances = accountBalances.get(acct.id) || { debit: 0, credit: 0 };
      let balance = 0;

      if (acct.type === 'asset' || acct.type === 'expense') {
        balance = balances.debit - balances.credit;
      } else {
        balance = balances.credit - balances.debit;
      }

      if (balance === 0) return;

      const accountData = {
        code: acct.code,
        name: acct.name,
        nameAr: acct.nameAr || '',
        balance,
      };

      if (acct.type === 'asset') {
        assets.push(accountData);
      } else if (acct.type === 'liability') {
        liabilities.push(accountData);
      } else if (acct.type === 'equity') {
        equity.push(accountData);
      }
    });

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
  }

  static async getIncomeStatement(tx: Tx, fromDate?: Date, toDate?: Date): Promise<{
    revenue: Array<{ code: string; name: string; nameAr: string; balance: number }>;
    expenses: Array<{ code: string; name: string; nameAr: string; balance: number }>;
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
  }> {
    const accounts = await tx.account.findMany({
      where: { isDeleted: false },
      select: { id: true, code: true, name: true, nameAr: true, type: true },
    });

    const where: WhereClause = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const journalLines = await tx.journalEntryLine.findMany({
      where,
      select: { accountId: true, debit: true, credit: true },
    });

    const accountBalances = new Map<string, { debit: number; credit: number }>();
    journalLines.forEach((line: JournalLineWithAccount) => {
      const current = accountBalances.get(line.accountId) || { debit: 0, credit: 0 };
      current.debit += Number(line.debit);
      current.credit += Number(line.credit);
      accountBalances.set(line.accountId, current);
    });

    const revenue: Array<{ code: string; name: string; nameAr: string; balance: number }> = [];
    const expenses: Array<{ code: string; name: string; nameAr: string; balance: number }> = [];

    accounts.forEach((acct) => {
      const balances = accountBalances.get(acct.id) || { debit: 0, credit: 0 };
      let balance = 0;

      if (acct.type === 'asset' || acct.type === 'expense') {
        balance = balances.debit - balances.credit;
      } else {
        balance = balances.credit - balances.debit;
      }

      if (balance === 0) return;

      const accountData = {
        code: acct.code,
        name: acct.name,
        nameAr: acct.nameAr || '',
        balance,
      };

      if (acct.type === 'revenue') {
        revenue.push(accountData);
      } else if (acct.type === 'expense') {
        expenses.push(accountData);
      }
    });

    const totalRevenue = revenue.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);
    const grossProfit = totalRevenue - (expenses.find((e) => e.code === '5100')?.balance || 0); // COGS
    const netProfit = totalRevenue - totalExpenses;

    return { revenue, expenses, totalRevenue, totalExpenses, grossProfit, netProfit };
  }

  static async closeAccountingPeriod(tx: Tx, periodId: string, tenantId: string, userId: string): Promise<void> {
    // Get the period
    const period = await tx.accountingPeriod.findUnique({
      where: { id: periodId },
      select: { id: true, startDate: true, endDate: true, status: true },
    });

    if (!period) throw new Error('Accounting period not found');
    if (period.status !== 'open') throw new Error('Period is not open');

    // Calculate net profit for the period
    const incomeStatement = await this.getIncomeStatement(tx, period.startDate, period.endDate);

    // Get account IDs
    const retainedEarningsId = await this.getAccountId(tx, '3101', tenantId); // RETAINED_EARNINGS

    // Create closing journal entry
    // Debit revenue accounts to zero them out
    // Credit retained earnings with total revenue
    // Debit retained earnings with total expenses
    // Credit expense accounts to zero them out

    const journalEntry = await tx.journalEntry.create({
      data: {
        date: new Date(),
        description: `Closing entry for period ${period.startDate.toISOString().split('T')[0]} to ${period.endDate.toISOString().split('T')[0]}`,
        type: 'INCOME',
        amount: incomeStatement.totalRevenue,
        createdById: userId,
        tenantId,
      },
    });

    // Close revenue accounts
    for (const rev of incomeStatement.revenue) {
      const accountId = await this.getAccountId(tx, rev.code, tenantId);
      await tx.journalEntryLine.create({
        data: {
          journalEntryId: journalEntry.id,
          accountId,
          debit: rev.balance,
          credit: 0,
          tenantId,
        },
      });
    }

    // Credit retained earnings with total revenue
    await tx.journalEntryLine.create({
      data: {
        journalEntryId: journalEntry.id,
        accountId: retainedEarningsId,
        debit: 0,
        credit: incomeStatement.totalRevenue,
        tenantId,
      },
    });

    // Debit retained earnings with total expenses
    await tx.journalEntryLine.create({
      data: {
        journalEntryId: journalEntry.id,
        accountId: retainedEarningsId,
        debit: incomeStatement.totalExpenses,
        credit: 0,
        tenantId,
      },
    });

    // Close expense accounts
    for (const exp of incomeStatement.expenses) {
      const accountId = await this.getAccountId(tx, exp.code, tenantId);
      await tx.journalEntryLine.create({
        data: {
          journalEntryId: journalEntry.id,
          accountId,
          debit: 0,
          credit: exp.balance,
          tenantId,
        },
      });
    }

    // Update period status to closed
    await tx.accountingPeriod.update({
      where: { id: periodId },
      data: { status: 'closed', closedAt: new Date() },
    });
  }
}
