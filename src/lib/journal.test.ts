import { describe, it, expect } from 'vitest';
import { getDebitAccountCode, getCreditAccountCode } from '@/lib/journal';
import { ACCOUNT_CODES } from '@/constants/accounting';

describe('journal - getDebitAccountCode', () => {
  it('returns CASH for SALE with cash payment', () => {
    expect(getDebitAccountCode({ type: 'SALE', paymentMethod: 'cash' })).toBe(ACCOUNT_CODES.CASH);
  });

  it('returns BANK for SALE with card payment', () => {
    expect(getDebitAccountCode({ type: 'SALE', paymentMethod: 'card' })).toBe(ACCOUNT_CODES.BANK);
  });

  it('returns BANK for SALE with transfer payment', () => {
    expect(getDebitAccountCode({ type: 'SALE', paymentMethod: 'transfer' })).toBe(ACCOUNT_CODES.BANK);
  });

  it('returns CASH for SALE with no payment method', () => {
    expect(getDebitAccountCode({ type: 'SALE' })).toBe(ACCOUNT_CODES.CASH);
  });

  it('returns CASH for INCOME', () => {
    expect(getDebitAccountCode({ type: 'INCOME', paymentMethod: 'cash' })).toBe(ACCOUNT_CODES.CASH);
  });

  it('returns SALES_REVENUE for RETURN', () => {
    expect(getDebitAccountCode({ type: 'RETURN' })).toBe(ACCOUNT_CODES.SALES_REVENUE);
  });

  it('returns INVENTORY for PURCHASE', () => {
    expect(getDebitAccountCode({ type: 'PURCHASE' })).toBe(ACCOUNT_CODES.INVENTORY);
  });

  it('returns OPERATING_EXPENSES for EXPENSE', () => {
    expect(getDebitAccountCode({ type: 'EXPENSE' })).toBe(ACCOUNT_CODES.OPERATING_EXPENSES);
  });

  it('returns INVENTORY for STOCK_ADJUSTMENT', () => {
    expect(getDebitAccountCode({ type: 'STOCK_ADJUSTMENT' })).toBe(ACCOUNT_CODES.INVENTORY);
  });
});

describe('journal - getCreditAccountCode', () => {
  it('returns SALES_REVENUE for SALE with no category', () => {
    expect(getCreditAccountCode({ type: 'SALE' })).toBe(ACCOUNT_CODES.SALES_REVENUE);
  });

  it('returns PARTS_SALES for SALE with spareparts category', () => {
    expect(getCreditAccountCode({ type: 'SALE', category: 'spareparts' })).toBe(ACCOUNT_CODES.PARTS_SALES);
  });

  it('returns SERVICE_REVENUE for SALE with service category', () => {
    expect(getCreditAccountCode({ type: 'SALE', category: 'service' })).toBe(ACCOUNT_CODES.SERVICE_REVENUE);
  });

  it('returns CASH for RETURN with cash payment', () => {
    expect(getCreditAccountCode({ type: 'RETURN', paymentMethod: 'cash' })).toBe(ACCOUNT_CODES.CASH);
  });

  it('returns BANK for RETURN with card payment', () => {
    expect(getCreditAccountCode({ type: 'RETURN', paymentMethod: 'card' })).toBe(ACCOUNT_CODES.BANK);
  });

  it('returns ACCOUNTS_PAYABLE for PURCHASE', () => {
    expect(getCreditAccountCode({ type: 'PURCHASE' })).toBe(ACCOUNT_CODES.ACCOUNTS_PAYABLE);
  });

  it('returns OTHER_REVENUE for INCOME', () => {
    expect(getCreditAccountCode({ type: 'INCOME' })).toBe(ACCOUNT_CODES.OTHER_REVENUE);
  });

  it('returns CASH for EXPENSE with cash', () => {
    expect(getCreditAccountCode({ type: 'EXPENSE', paymentMethod: 'cash' })).toBe(ACCOUNT_CODES.CASH);
  });

  it('returns BANK for EXPENSE with card', () => {
    expect(getCreditAccountCode({ type: 'EXPENSE', paymentMethod: 'card' })).toBe(ACCOUNT_CODES.BANK);
  });

  it('returns INVENTORY for STOCK_ADJUSTMENT', () => {
    expect(getCreditAccountCode({ type: 'STOCK_ADJUSTMENT' })).toBe(ACCOUNT_CODES.INVENTORY);
  });
});
