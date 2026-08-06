import { describe, it, expect } from 'vitest';
import {
  effectiveTaxRate,
  taxForLine,
  computeTaxTotal,
  computeWorkOrderTotals,
  nextInvoiceNumber,
  DEFAULT_TAX_RATE,
} from '@/lib/order-totals';

describe('order-totals - effectiveTaxRate', () => {
  it('returns 0 for exempt products', () => {
    expect(effectiveTaxRate(14, true)).toBe(0);
  });

  it('returns the product rate when set', () => {
    expect(effectiveTaxRate(5, false)).toBe(5);
    expect(effectiveTaxRate('10', false)).toBe(10);
  });

  it('falls back to the general rate when the product rate is null/0/undefined', () => {
    expect(effectiveTaxRate(null, false)).toBe(DEFAULT_TAX_RATE);
    expect(effectiveTaxRate(undefined, false)).toBe(DEFAULT_TAX_RATE);
    expect(effectiveTaxRate(0, false)).toBe(DEFAULT_TAX_RATE);
  });
});

describe('order-totals - computeTaxTotal', () => {
  it('taxes per-product rates, skips exempt, defaults null to 14%', () => {
    const tax = computeTaxTotal([
      { amount: 1000, taxRate: 14 },          // 140
      { amount: 1000, taxRate: 5 },           // 50
      { amount: 1000, taxExempt: true },      // 0
      { amount: 1000, taxRate: null },        // 140 (general fallback)
    ]);
    expect(tax).toBe(330);
  });

  it('rounds to 2 decimals', () => {
    const tax = computeTaxTotal([{ amount: 33.33, taxRate: 14 }]);
    expect(tax).toBeCloseTo(4.67, 2);
  });
});

describe('order-totals - computeWorkOrderTotals', () => {
  const parts = [
    { total: 1000, product: { taxRate: 14, taxExempt: false } },
    { total: 500, product: { taxRate: null, taxExempt: false } }, // 14% fallback → 70
  ];
  const labour = [{ total: 300 }, { total: 200 }];

  it('taxes parts only — labour is never taxed', () => {
    const totals = computeWorkOrderTotals(parts, labour, 0);
    expect(totals.partsTotal).toBe(1500);
    expect(totals.labourTotal).toBe(500);
    expect(totals.subtotal).toBe(2000);
    expect(totals.taxTotal).toBe(210); // 140 + 70
    expect(totals.total).toBe(2210);
  });

  it('applies discount to the subtotal without reducing the taxable base', () => {
    const totals = computeWorkOrderTotals(parts, labour, 200);
    expect(totals.discountAmount).toBe(200);
    expect(totals.taxTotal).toBe(210);
    expect(totals.total).toBe(2010);
  });

  it('caps discount at the subtotal', () => {
    const totals = computeWorkOrderTotals(parts, labour, 99999);
    expect(totals.discountAmount).toBe(2000);
    expect(totals.total).toBe(210);
  });
});

describe('order-totals - nextInvoiceNumber', () => {
  const makeTx = (numbers: string[]) =>
    ({
      $queryRaw: async () => numbers.map((number) => ({ number })),
    }) as unknown as Parameters<typeof nextInvoiceNumber>[0];

  it('starts at 0001 when no invoices exist', async () => {
    const num = await nextInvoiceNumber(makeTx([]), 't1', 'INV');
    expect(num).toMatch(/^INV-\d{8}-0001$/);
  });

  it('increments from the highest existing number', async () => {
    const yesterday = 'INV-20260804-0003';
    const num = await nextInvoiceNumber(makeTx([yesterday]), 't1', 'INV');
    expect(num.endsWith('0004')).toBe(true);
  });

  it('uses the RET prefix for returns', async () => {
    const num = await nextInvoiceNumber(makeTx(['RET-20260804-0001']), 't1', 'RET');
    expect(num.endsWith('0002')).toBe(true);
    expect(num.startsWith('RET-')).toBe(true);
  });
});
