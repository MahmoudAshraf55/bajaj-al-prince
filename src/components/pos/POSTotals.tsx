'use client';

import { computeTaxTotal } from '@/lib/order-totals';

interface POSTotalsProps {
  subtotal: number;
  discountNum: number;
  taxTotal: number;
  taxRate: number;
  total: number;
  t: (key: string) => string;
}

export interface POSTotalsResult {
  subtotal: number;
  discountNum: number;
  afterDiscount: number;
  taxTotal: number;
  total: number;
  splitTotal: number;
  paidNum: number;
  remaining: number;
  change: number;
}

export interface POSTotalsCartItem {
  total: number;
  taxRate?: number | null;
  taxExempt?: boolean;
}

export function computePOSTotals(
  cart: Array<POSTotalsCartItem>,
  discount: number,
  discountType: 'amount' | 'percent',
  taxRate: number,
  paid: string,
  splitPayments: Array<{ amount: string }>,
): POSTotalsResult {
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountNum = discountType === 'percent'
    ? Math.min(subtotal * (discount || 0) / 100, subtotal)
    : Math.min(discount, subtotal);
  const afterDiscount = subtotal - discountNum;
  // Per-product tax (exempt skipped, product rate, general-rate fallback) —
  // matches the server /invoices computation. discount does not reduce the
  // taxable base, matching the server.
  const taxTotal = computeTaxTotal(cart.map((item) => ({
    amount: item.total,
    taxRate: item.taxRate,
    taxExempt: item.taxExempt,
  })));
  const total = afterDiscount + taxTotal;

  const splitTotal = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const paidNum = splitPayments.length > 0 ? splitTotal : (parseFloat(paid) || 0);
  const remaining = Math.max(0, total - paidNum);
  const change = paidNum >= total ? paidNum - total : 0;

  return { subtotal, discountNum, afterDiscount, taxTotal, total, splitTotal, paidNum, remaining, change };
}

export default function POSTotals({
  subtotal,
  discountNum,
  taxTotal,
  taxRate,
  total,
  t,
}: POSTotalsProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>{t('pos_subtotal')}</span>
        <span>{subtotal.toFixed(2)} EGP</span>
      </div>
      {discountNum > 0 && (
        <div className="flex justify-between">
          <span>{t('pos_discount')}</span>
          <span>-{discountNum.toFixed(2)} EGP</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>{t('pos_tax')} ({taxRate}%)</span>
        <span>{taxTotal.toFixed(2)} EGP</span>
      </div>
      <div className="flex justify-between font-bold text-lg pt-1 border-t border-border">
        <span>{t('pos_total')}</span>
        <span>{total.toFixed(2)} EGP</span>
      </div>
    </div>
  );
}
