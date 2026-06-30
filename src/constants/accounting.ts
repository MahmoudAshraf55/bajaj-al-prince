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

export type AccountCode = typeof ACCOUNT_CODES[keyof typeof ACCOUNT_CODES];

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const JOURNAL_ENTRY_TYPES = {
  SALE: 'SALE',
  RETURN: 'RETURN',
  PURCHASE: 'PURCHASE',
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT',
} as const;

export type JournalEntryType = typeof JOURNAL_ENTRY_TYPES[keyof typeof JOURNAL_ENTRY_TYPES];
