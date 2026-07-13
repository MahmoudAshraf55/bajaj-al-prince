import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { Prisma } from '@prisma/client';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const CREATE_BATCH_SIZE = 500;
const UPDATE_BATCH_SIZE = 100;

interface ExtractedRow {
  row: number;
  sku: string | null;
  barcode: string | null;
  name: string;
  nameAr: string | null;
  price: number | null;
  costPrice: number | null;
  stock: number | null;
  unit: string | null;
  description: string | null;
  taxRate: number | null;
}

function extractTableLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function guessPrice(val: string): number | null {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function extractRows(text: string): ExtractedRow[] {
  const lines = extractTableLines(text);
  const rows: ExtractedRow[] = [];
  let rowIdx = 1;

  // Common unit abbreviations
  const units = ['pcs', 'unit', 'box', 'bag', 'set', 'kit', 'piece', 'pieces', 'qty', 'وحدة', 'عبوة', 'طقم'];

  for (const line of lines) {
    if (line.length < 5) continue;
    const tokens = line.split(/\s{2,}|\t|,|;/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) continue;

    // Find name (first non-numeric token that looks like a product name)
    let name = tokens[0];
    let nameAr: string | null = null;

    // If first token is too short or numeric, find a better name
    if (name.length < 3 || /^\d+$/.test(name)) {
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].length >= 3 && !/^\d/.test(tokens[i])) {
          name = tokens[i];
          break;
        }
      }
    }

    // Check for Arabic name (usually follows English name)
    if (isArabicText(line)) {
      for (let i = 0; i < tokens.length; i++) {
        if (isArabicText(tokens[i]) && tokens[i].length >= 2) {
          nameAr = tokens[i];
          break;
        }
      }
    }

    // Extract price (try to find numeric values)
    let price: number | null = null;
    let costPrice: number | null = null;
    let priceTokenIdx = -1;

    // Try to find two numeric values (price and costPrice)
    const numericTokens: Array<{ idx: number; val: number }> = [];
    for (let i = 0; i < tokens.length; i++) {
      const val = guessPrice(tokens[i]);
      if (val !== null && val > 0) {
        numericTokens.push({ idx: i, val });
      }
    }

    if (numericTokens.length >= 2) {
      // Last two numeric values: costPrice then price
      costPrice = numericTokens[numericTokens.length - 2].val;
      price = numericTokens[numericTokens.length - 1].val;
      priceTokenIdx = numericTokens[numericTokens.length - 1].idx;
    } else if (numericTokens.length === 1) {
      price = numericTokens[0].val;
      priceTokenIdx = numericTokens[0].idx;
    }

    // Extract stock (usually a smallish integer, often near the price)
    let stock: number | null = null;
    for (let i = Math.max(0, priceTokenIdx - 2); i < tokens.length; i++) {
      const val = parseFloat(tokens[i]);
      if (!isNaN(val) && val > 0 && val < 10000 && Number.isInteger(val)) {
        // Check if this looks like a stock quantity
        if (!numericTokens.some((nt) => nt.idx === i)) {
          stock = val;
          break;
        }
      }
    }

    // Extract SKU (alphanumeric code)
    let sku: string | null = null;
    for (const token of tokens) {
      if (/^[A-Z0-9]{3,20}$/i.test(token) && token !== name && !sku) {
        sku = token;
      }
    }

    // Extract barcode (8-14 digits)
    let barcode: string | null = null;
    for (const token of tokens) {
      if (/^\d{8,14}$/.test(token) && !barcode) {
        barcode = token;
      }
    }

    // Extract unit (look for common abbreviations)
    let unit: string | null = null;
    for (const token of tokens) {
      if (units.includes(token.toLowerCase())) {
        unit = token;
        break;
      }
    }

    // Description from line if long enough
    const description = line.length > 100 ? line.substring(0, 200) : null;

    // Try to extract tax rate (look for percentages)
    let taxRate: number | null = null;
    for (const token of tokens) {
      if (token.endsWith('%')) {
        const val = parseFloat(token);
        if (!isNaN(val) && val > 0 && val < 100) {
          taxRate = val;
          break;
        }
      }
    }

    rows.push({
      row: rowIdx++,
      sku,
      barcode,
      name,
      nameAr,
      price,
      costPrice,
      stock,
      unit,
      description,
      taxRate,
    });
  }

  return rows;
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const action = (formData.get('action') as string) || 'preview';

      if (!file) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 }));
      }

      if (file.size > MAX_FILE_SIZE) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 400 }));
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      const extractedRows = extractRows(pdfData.text);

      if (extractedRows.length === 0) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Could not extract any product data from this PDF' }, { status: 400 }));
      }

      if (action === 'preview') {
        return withSecurityHeaders(NextResponse.json({
          success: true,
          data: {
            totalRows: extractedRows.length,
            preview: extractedRows.slice(0, 10),
            textSample: pdfData.text.substring(0, 500),
          },
        }));
      }

      const skuList = extractedRows.map((r) => r.sku).filter((s): s is string => !!s);
      const barcodeList = extractedRows.map((r) => r.barcode).filter((b): b is string => !!b);

      const existingProducts = skuList.length > 0 || barcodeList.length > 0
        ? await prisma.product.findMany({
            where: {
              OR: [
                ...(skuList.length > 0 ? [{ sku: { in: skuList } }] : []),
                ...(barcodeList.length > 0 ? [{ barcode: { in: barcodeList } }] : []),
              ],
            },
            select: { id: true, sku: true, barcode: true, isDeleted: true },
          })
        : [];

      const existingByBarcode = new Map<string, { id: string; isDeleted: boolean }>();
      const existingBySku = new Map<string, { id: string; isDeleted: boolean }>();
      for (const p of existingProducts) {
        if (p.barcode && !existingByBarcode.has(p.barcode)) existingByBarcode.set(p.barcode, { id: p.id, isDeleted: p.isDeleted });
        if (p.sku && !existingBySku.has(p.sku)) existingBySku.set(p.sku, { id: p.id, isDeleted: p.isDeleted });
      }

      const toCreate: Prisma.ProductCreateManyInput[] = [];
      const toUpdate: { id: string; data: Prisma.ProductUpdateInput }[] = [];

       for (const row of extractedRows) {
         const match = (row.barcode && existingByBarcode.get(row.barcode))
           || (row.sku && existingBySku.get(row.sku))
           || null;

         const data: Prisma.ProductCreateManyInput = {
           name: row.name,
           nameAr: row.nameAr,
           sku: row.sku,
           barcode: row.barcode,
           category: 'Spare Parts',
           price: row.price ?? 0,
           costPrice: row.costPrice ?? undefined,
           stock: row.stock ?? 1,
           unit: row.unit ?? undefined,
           description: row.description ?? undefined,
           taxRate: row.taxRate ?? undefined,
           tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
         };

         if (match) {
           if (match.isDeleted) (data as Record<string, unknown>).isDeleted = false;
           toUpdate.push({ id: match.id, data });
         } else {
           toCreate.push(data);
         }
       }

      let created = 0;
      let updated = 0;
      let skipped = 0;

      if (toCreate.length > 0) {
        for (let i = 0; i < toCreate.length; i += CREATE_BATCH_SIZE) {
          const batch = toCreate.slice(i, i + CREATE_BATCH_SIZE);
          try {
            const result = await prisma.product.createMany({ data: batch });
            created += result.count;
          } catch {
            for (const item of batch) {
              try {
                await prisma.product.create({ data: item as never });
                created++;
              } catch {
                skipped++;
              }
            }
          }
        }
      }

      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH_SIZE) {
          const batch = toUpdate.slice(i, i + UPDATE_BATCH_SIZE);
          await prisma.$transaction(
            batch.map((item) =>
              prisma.product.update({
                where: { id: item.id },
                data: item.data,
              })
            )
          );
          updated += batch.length;
        }
      }

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        userId: payload.userId,
        action: 'import',
        entity: 'Product',
        newValue: { source: 'pdf', created, updated, skipped, total: extractedRows.length } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: { created, updated, skipped, total: extractedRows.length },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF import failed';
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 400 }));
  }
}
