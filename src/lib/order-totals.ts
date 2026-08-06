import type { Prisma } from '@prisma/client';

/**
 * Single source of truth for invoice/work-order totals and tax rules.
 *
 * Tax rules (Bajaj Ghabbour decision — 2026):
 * - Tax applies to PARTS only. Labour/service lines are never taxed.
 * - Each line uses its own product rate (`Product.taxRate`).
 * - A product with `taxExempt = true` contributes zero tax.
 * - A product with no explicit rate falls back to the general rate (14%).
 * - Discount reduces the subtotal but does not reduce the taxable base,
 *   matching the POS /invoices behaviour.
 */

export const DEFAULT_TAX_RATE = 14;

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type TaxableAmount = number | string | Prisma.Decimal;

export interface TaxLine {
  amount: TaxableAmount;
  taxRate?: number | string | Prisma.Decimal | null;
  taxExempt?: boolean | null;
}

/** Effective per-line rate (0 for exempt products, product rate, else the general 14%). */
export function effectiveTaxRate(
  taxRate: number | string | Prisma.Decimal | null | undefined,
  taxExempt?: boolean | null,
): number {
  if (taxExempt) return 0;
  const rate = Number(taxRate);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_TAX_RATE;
}

/** Tax amount for a single line. */
export function taxForLine(amount: TaxableAmount, taxRate: number | string | Prisma.Decimal | null | undefined, taxExempt?: boolean | null): number {
  return Number(amount) * (effectiveTaxRate(taxRate, taxExempt) / 100);
}

/** Sum of per-line tax, rounded to 2 decimals. */
export function computeTaxTotal(lines: TaxLine[]): number {
  return round2(lines.reduce((sum, l) => sum + taxForLine(l.amount, l.taxRate, l.taxExempt), 0));
}

export interface OrderTotals {
  partsTotal: number;
  labourTotal: number;
  subtotal: number;
  discountAmount: number;
  taxTotal: number;
  total: number;
}

export interface WorkOrderTaxablePart {
  total: TaxableAmount;
  product?: {
    taxRate?: number | string | Prisma.Decimal | null;
    taxExempt?: boolean | null;
  } | null;
}

export interface WorkOrderLabourLine {
  total: TaxableAmount | null | undefined;
}

/**
 * Compute authoritative work-order totals from DB rows.
 * Discount is applied to the subtotal (parts + labour); tax is parts-only.
 */
export function computeWorkOrderTotals(
  parts: WorkOrderTaxablePart[],
  labourLines: WorkOrderLabourLine[],
  discount = 0,
): OrderTotals {
  const partsTotal = round2(parts.reduce((sum, p) => sum + Number(p.total), 0));
  const labourTotal = round2(labourLines.reduce((sum, l) => sum + (l.total ? Number(l.total) : 0), 0));
  const taxTotal = computeTaxTotal(parts.map((p) => ({
    amount: p.total,
    taxRate: p.product?.taxRate,
    taxExempt: p.product?.taxExempt,
  })));
  const subtotal = round2(partsTotal + labourTotal);
  const discountAmount = Math.min(Math.max(0, discount), subtotal);
  const total = round2(Math.max(0, subtotal - discountAmount) + taxTotal);
  return { partsTotal, labourTotal, subtotal, discountAmount, taxTotal, total };
}

type QueryableTx = {
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
};

/**
 * Generate the next sequential invoice number for a tenant/day.
 *
 * Uses a raw query on purpose: the global Prisma client extension injects
 * `isDeleted: false` into every model query, so a normal findFirst would skip
 * soft-deleted invoices — but the unique index `(tenantId, number)` still
 * covers them, causing P2002 collisions (500s). Counting every row (deleted
 * or not) guarantees burned numbers are never reused.
 */
export async function nextInvoiceNumber(
  tx: QueryableTx,
  tenantId: string,
  prefixType: 'INV' | 'RET' = 'INV',
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `${prefixType}-${dateStr}-`;

  const rows = await tx.$queryRaw<Array<{ number: string }>>`
    SELECT "number" FROM "Invoice"
    WHERE "tenantId" = ${tenantId} AND "number" LIKE ${prefix + '%'}
    ORDER BY "number" DESC
    LIMIT 1`;

  let nextSeq = 1;
  if (rows.length > 0) {
    const parts = rows[0].number.split('-');
    nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}
