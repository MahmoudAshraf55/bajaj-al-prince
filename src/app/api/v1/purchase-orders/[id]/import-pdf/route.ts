import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface ExtractedItem {
  row: number;
  barcode: string | null;
  productName: string | null;
  matchedProduct: { id: string; name: string; barcode: string | null; costPrice: number | null } | null;
  quantity: number;
  unitPrice: number | null;
  total: number | null;
}

function extractLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 5);
}

function parseNumber(val: string): number | null {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function extractItems(text: string): Omit<ExtractedItem, 'matchedProduct'>[] {
  const lines = extractLines(text);
  const items: Omit<ExtractedItem, 'matchedProduct'>[] = [];
  let rowIdx = 1;

  for (const line of lines) {
    // Skip header-like lines
    if (/^(No|#|Item|Code|Product|Description|Qty|Quantity|Price|Total|Rate|Unit)/i.test(line)) continue;
    if (/^(Page|Subtotal|Grand|Sum|Total|Prepared|Date|PO|Order|Supplier)/i.test(line)) continue;

    const tokens = line.split(/\s{2,}|\t|,|;/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) continue;

    // Find barcode: 8-14 digits
    let barcode: string | null = null;
    for (const t of tokens) {
      if (/^\d{8,14}$/.test(t)) { barcode = t; break; }
    }

    // Find product name: longest non-numeric token
    let productName: string | null = null;
    let longestLen = 0;
    for (const t of tokens) {
      if (t.length > longestLen && !/^\d+$/.test(t) && t.length >= 2) {
        productName = t;
        longestLen = t.length;
      }
    }

    // Find numeric values: quantity (small integer), unitPrice, total
    const nums: number[] = [];
    for (const t of tokens) {
      const n = parseNumber(t);
      if (n !== null && n > 0) nums.push(n);
    }

    let quantity = 1;
    let unitPrice: number | null = null;
    let total: number | null = null;

    if (nums.length >= 3) {
      // Pattern: quantity, unitPrice, total
      quantity = Math.round(nums[0]) || 1;
      unitPrice = nums[nums.length - 2];
      total = nums[nums.length - 1];
    } else if (nums.length === 2) {
      // Pattern: unitPrice, total or quantity, unitPrice
      if (nums[0] < 100 && Number.isInteger(nums[0])) {
        quantity = nums[0];
        unitPrice = nums[1];
        total = quantity * (unitPrice ?? 0);
      } else {
        unitPrice = nums[0];
        total = nums[1];
        if (unitPrice > 0) quantity = Math.round(total / unitPrice);
      }
    } else if (nums.length === 1) {
      total = nums[0];
      unitPrice = total;
    }

    items.push({ row: rowIdx++, barcode, productName, quantity: Math.max(1, quantity), unitPrice, total });
  }

  return items;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      await params;
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file || !file.name.endsWith('.pdf')) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'PDF file required' }, { status: 400 }));
      }
      if (file.size > MAX_FILE_SIZE) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 }));
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();

      const extracted = extractItems(pdfData.text);
      if (extracted.length === 0) {
        return withSecurityHeaders(NextResponse.json({
          success: true,
          data: { textSample: pdfData.text.substring(0, 500), items: [], message: 'No items could be extracted from this PDF' },
        }));
      }

      // Match barcodes to existing products
      const barcodes = [...new Set(extracted.filter((e) => e.barcode).map((e) => e.barcode!))];
      const products = barcodes.length > 0
        ? await prisma.product.findMany({
            where: { barcode: { in: barcodes }, isDeleted: false },
            select: { id: true, name: true, barcode: true, costPrice: true },
          })
        : [];

      const productMap = new Map(products.map((p) => [p.barcode, { ...p, costPrice: Number(p.costPrice) }]));

      const items: ExtractedItem[] = extracted.map((e) => ({
        ...e,
        matchedProduct: e.barcode ? (productMap.get(e.barcode) || null) : null,
      }));

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: { textSample: pdfData.text.substring(0, 300), items },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF import failed';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 400 }));
  }
}
