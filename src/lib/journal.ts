import { prisma } from '@/lib/prisma';
import { DEFAULT_TENANT_ID, getTenantId } from '@/lib/tenant-context';

import { ACCOUNT_CODES } from '@/constants/accounting';

type Tx = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function getAccountByCode(tx: Tx, code: string, tenantId: string): Promise<string> {
  const account = await tx.account.findFirst({
    where: { code, OR: [{ tenantId }, { tenantId: DEFAULT_TENANT_ID }] },
    orderBy: { tenantId: 'desc' },
    select: { id: true },
  });
  if (!account) {
    throw new Error(`Account with code ${code} not found. Run seed-accounts first.`);
  }
  return account.id;
}

export interface DoubleEntryInput {
  type: 'SALE' | 'RETURN' | 'PURCHASE' | 'EXPENSE' | 'INCOME' | 'STOCK_ADJUSTMENT' | 'SUPPLIER_PAYMENT';
  amount: number;
  amountPaid?: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  category?: string;
  paymentMethod?: string;
  expenseCategory?: 'rent' | 'salaries' | 'utilities' | 'marketing' | 'operating' | 'other';
  createdById: string;
  date?: Date;
  tenantId?: string;
}

export async function createDoubleEntry(
  tx: Tx,
  input: DoubleEntryInput,
): Promise<{ id: string; amount: number }> {
  const tenantId = input.tenantId ?? getTenantId() ?? DEFAULT_TENANT_ID;
  const date = input.date ?? new Date();
  const amount = Math.round(input.amount * 100) / 100;

  const debitAccountCode = getDebitAccountCode(input);
  const creditAccountCode = getCreditAccountCode(input);

  // F-058: For credit/partial sales (amountPaid < amount), create a 3-line entry:
  //   DR: Cash/Bank (amountPaid)
  //   DR: Accounts Receivable (amount - amountPaid)
  //   CR: Revenue (amount)
  const paidAmount = input.amountPaid != null ? Math.round(input.amountPaid * 100) / 100 : null;
  const hasPartialPayment = input.type === 'SALE' && paidAmount !== null && paidAmount < amount;

  const lines: Array<{ accountId: string; debit: number; credit: number; description?: string; tenantId: string }> = [];
  let arAccountId: string | null = null;

  if (hasPartialPayment) {
    const cashAccountId = await getAccountByCode(tx, debitAccountCode, tenantId);
    arAccountId = await getAccountByCode(tx, ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, tenantId);
    const revenueAccountId = await getAccountByCode(tx, creditAccountCode, tenantId);

    if (paidAmount! > 0) {
      lines.push({ accountId: cashAccountId, debit: paidAmount!, credit: 0, description: input.description, tenantId });
    }
    lines.push({ accountId: arAccountId, debit: amount - paidAmount!, credit: 0, description: input.description, tenantId });
    lines.push({ accountId: revenueAccountId, debit: 0, credit: amount, description: input.description, tenantId });

    const entry = await tx.journalEntry.create({
      data: {
        type: input.type,
        amount,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        referenceNumber: input.referenceNumber,
        category: input.category,
        paymentMethod: input.paymentMethod,
        debitAccountId: cashAccountId,
        creditAccountId: revenueAccountId,
        createdById: input.createdById,
        date,
        tenantId,
        lines: { create: lines },
      },
    });

    return { id: entry.id, amount: Number(entry.amount) };
  }

  const [debitAccountId, creditAccountId] = await Promise.all([
    getAccountByCode(tx, debitAccountCode, tenantId),
    getAccountByCode(tx, creditAccountCode, tenantId),
  ]);

  const entry = await tx.journalEntry.create({
    data: {
      type: input.type,
      amount,
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      referenceNumber: input.referenceNumber,
      category: input.category,
      paymentMethod: input.paymentMethod,
      debitAccountId,
      creditAccountId,
      createdById: input.createdById,
      date,
      tenantId,
      lines: {
        create: [
          {
            accountId: debitAccountId,
            debit: amount,
            credit: 0,
            description: input.description,
            tenantId,
          },
          {
            accountId: creditAccountId,
            debit: 0,
            credit: amount,
            description: input.description,
            tenantId,
          },
        ],
      },
    },
  });

  return { id: entry.id, amount: Number(entry.amount) };
}

export function getDebitAccountCode(input: Partial<DoubleEntryInput>): string {
  switch (input.type) {
    case 'SALE':
    case 'INCOME':
      return input.paymentMethod === 'card' || input.paymentMethod === 'transfer'
        ? ACCOUNT_CODES.BANK
        : ACCOUNT_CODES.CASH;
    case 'RETURN':
      return ACCOUNT_CODES.SALES_REVENUE;
    case 'PURCHASE':
      return ACCOUNT_CODES.INVENTORY;
    case 'EXPENSE': {
      switch (input.expenseCategory) {
        case 'rent': return ACCOUNT_CODES.RENT_EXPENSE;
        case 'salaries': return ACCOUNT_CODES.SALARIES_EXPENSE;
        case 'utilities': return ACCOUNT_CODES.UTILITIES_EXPENSE;
        case 'marketing': return ACCOUNT_CODES.MARKETING_EXPENSE;
        case 'other': return ACCOUNT_CODES.OTHER_EXPENSES;
        default: return ACCOUNT_CODES.OPERATING_EXPENSES;
      }
    }
    case 'STOCK_ADJUSTMENT':
      return ACCOUNT_CODES.COGS;
    case 'SUPPLIER_PAYMENT':
      return ACCOUNT_CODES.ACCOUNTS_PAYABLE;
    default:
      return ACCOUNT_CODES.CASH;
  }
}

export function getCreditAccountCode(input: Partial<DoubleEntryInput>): string {
  switch (input.type) {
    case 'SALE':
      return input.category === 'spareparts'
        ? ACCOUNT_CODES.PARTS_SALES
        : input.category === 'service'
          ? ACCOUNT_CODES.SERVICE_REVENUE
          : ACCOUNT_CODES.SALES_REVENUE;
    case 'RETURN':
      return input.paymentMethod === 'card' || input.paymentMethod === 'transfer'
        ? ACCOUNT_CODES.BANK
        : ACCOUNT_CODES.CASH;
    case 'PURCHASE':
      return ACCOUNT_CODES.ACCOUNTS_PAYABLE;
    case 'INCOME':
      return ACCOUNT_CODES.OTHER_REVENUE;
    case 'EXPENSE':
      return input.paymentMethod === 'card' || input.paymentMethod === 'transfer'
        ? ACCOUNT_CODES.BANK
        : ACCOUNT_CODES.CASH;
    case 'STOCK_ADJUSTMENT':
      return ACCOUNT_CODES.INVENTORY;
    case 'SUPPLIER_PAYMENT':
      return input.paymentMethod === 'card' || input.paymentMethod === 'transfer'
        ? ACCOUNT_CODES.BANK
        : ACCOUNT_CODES.CASH;
    default:
      return ACCOUNT_CODES.OTHER_REVENUE;
  }
}
