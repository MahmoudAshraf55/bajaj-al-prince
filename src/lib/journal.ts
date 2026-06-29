import { prisma } from '@/lib/prisma';
import { DEFAULT_TENANT_ID, getTenantId } from '@/lib/tenant-context';

export const ACCOUNT_CODES = {
  CASH: '1101',
  BANK: '1102',
  ACCOUNTS_RECEIVABLE: '1103',
  INVENTORY: '1104',
  ACCOUNTS_PAYABLE: '2101',
  TAXES_PAYABLE: '2102',
  SALES_REVENUE: '4100',
  PARTS_SALES: '4101',
  SERVICE_REVENUE: '4102',
  OTHER_REVENUE: '4200',
  COGS: '5100',
  OPERATING_EXPENSES: '5200',
  OTHER_EXPENSES: '5300',
} as const;

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
  type: 'SALE' | 'RETURN' | 'PURCHASE' | 'EXPENSE' | 'INCOME' | 'STOCK_ADJUSTMENT';
  amount: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  category?: string;
  paymentMethod?: string;
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
    case 'EXPENSE':
      return ACCOUNT_CODES.OPERATING_EXPENSES;
    case 'STOCK_ADJUSTMENT':
      return ACCOUNT_CODES.INVENTORY;
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
    default:
      return ACCOUNT_CODES.OTHER_REVENUE;
  }
}
