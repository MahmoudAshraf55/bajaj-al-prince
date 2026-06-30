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
  price: number | null;
  stock: number | null;
}

function extractTableLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function guessPrice(val: string): number | null {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function extractRows(text: string): ExtractedRow[] {
  const lines = extractTableLines(text);
  const rows: ExtractedRow[] = [];
  let rowIdx = 1;

  for (const line of lines) {
    if (line.length < 5) continue;
    const tokens = line.split(/\s{2,}|\t|,|;/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) continue;

    const name = tokens[0];
    const lastToken = tokens[tokens.length - 1];
    const secondLast = tokens.length > 2 ? tokens[tokens.length - 2] : null;

    const price = guessPrice(lastToken) ?? guessPrice(secondLast ?? '') ?? null;
    const stock = null;

    let sku: string | null = null;
    let barcode: string | null = null;
    for (const token of tokens) {
      if (/^[A-Z0-9]{3,20}$/i.test(token) && token !== name && !sku) {
        sku = token;
      }
      if (/^\d{8,14}$/.test(token) && !barcode) {
        barcode = token;
      }
    }

    rows.push({
      row: rowIdx++,
      sku,
      barcode,
      name,
      price,
      stock,
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
          sku: row.sku,
          barcode: row.barcode,
          category: 'Spare Parts',
          price: row.price ?? 0,
          stock: row.stock ?? 1,
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
