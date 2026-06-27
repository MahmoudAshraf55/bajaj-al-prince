import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';

const MAX_ROWS = 20000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const UPDATE_BATCH_SIZE = 100;
const CREATE_BATCH_SIZE = 500;

export const maxDuration = 60;

interface PreviewRow {
  row: number;
  sku: string | null;
  barcode: string | null;
  name: string;
  nameAr: string | null;
  vehicleModel: string | null;
  category: string | null;
  price: number | null;
  costPrice: number | null;
  stock: number | null;
  unit: string | null;
  description: string | null;
  taxRate: number | null;
  activeFrom: string | null;
  expiryDate: string | null;
}

interface ParsedData {
  headers: string[];
  preview: PreviewRow[];
  totalRows: number;
  fileName: string;
}

function isValidDateStr(val: string): boolean {
  if (!val) return false;
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  return year >= 1900 && year <= 2100;
}

function colVal(row: Record<string, string | number>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== '') return String(v).trim();
  }
  return '';
}

function parseNum(row: Record<string, string | number>, ...keys: string[]): number | null {
  const val = colVal(row, ...keys);
  if (!val) return null;
  if (!isNaN(Number(val))) return Number(val);
  const cleaned = val.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDateStr(row: Record<string, string | number>, ...keys: string[]): string | null {
  const val = colVal(row, ...keys);
  if (!val) return null;
  return isValidDateStr(val) ? val : null;
}

function parseRow(row: Record<string, string | number>, rowNum: number): PreviewRow {
  const partsSku = colVal(row, 'Parts', 'SKU', 'sku', 'Part Number', 'part_number');
  const barcodeVal = colVal(row, 'Barcode', 'باركود', 'barcode') || partsSku;

  const tax10 = parseNum(row, 'ضريبه 10%', 'tax 10%', 'tax10', 'tax_10');
  const tax12 = parseNum(row, 'ضريبه 12%', 'tax 12%', 'tax12', 'tax_12');
  const taxRate = tax10 ?? tax12 ?? null;

  return {
    row: rowNum,
    sku: partsSku || null,
    barcode: barcodeVal || null,
    name: colVal(row, 'en', 'English Name', 'name', 'Name') || `Product ${rowNum}`,
    nameAr: colVal(row, 'ar', 'Arabic Name', 'nameAr', 'name_ar') || null,
    vehicleModel: colVal(row, 'mod', 'Model', 'vehicleModel', 'vehicle_model') || null,
    category: colVal(row, 'cat', 'Category', 'category') || 'Spare Parts',
    price: parseNum(row, 'مستهلك بالضريبة', 'price', 'سعر', 'Price', 'السعر'),
    costPrice: parseNum(row, 'cost', 'Cost', 'تكلفة', 'costPrice', 'سعر الشراء'),
    stock: parseNum(row, 'stock', 'Stock', 'مخزون', 'quantity', 'Qty'),
    unit: colVal(row, 'unit', 'Unit', 'وحدة') || null,
    description: colVal(row, 'desc', 'Description', 'description', 'وصف') || null,
    taxRate,
    activeFrom: parseDateStr(row, 'Start Date Active', 'activeFrom', 'date', 'Date'),
    expiryDate: parseDateStr(row, 'Expiry', 'expiryDate', 'expiry', 'صلاحية'),
  };
}

function parseExcelSheet(buffer: Buffer, fileName: string): ParsedData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });

  if (jsonData.length === 0) throw new Error('Excel file is empty');
  if (jsonData.length > MAX_ROWS) throw new Error(`Excel has ${jsonData.length} rows, max allowed is ${MAX_ROWS}`);

  const headers = Object.keys(jsonData[0]);
  const allPreview: PreviewRow[] = [];

  for (let i = 0; i < jsonData.length; i++) {
    allPreview.push(parseRow(jsonData[i], i + 2));
  }

  return {
    headers,
    preview: allPreview.slice(0, 10),
    totalRows: allPreview.length,
    fileName,
  };
}

function buildCreateData(row: PreviewRow): Prisma.ProductCreateManyInput {
  const data: Prisma.ProductCreateManyInput = {
    name: row.name,
    nameAr: row.nameAr,
    sku: row.sku,
    barcode: row.barcode,
    vehicleModel: row.vehicleModel,
    category: row.category || 'Spare Parts',
    price: row.price ?? 0,
    stock: row.stock ?? 1,
  };
  if (row.costPrice != null) data.costPrice = row.costPrice;
  if (row.unit) data.unit = row.unit;
  if (row.description) data.description = row.description;
  if (row.taxRate != null) {
    data.taxRate = row.taxRate;
    data.taxExempt = false;
  }
  if (row.activeFrom) data.activeFrom = new Date(row.activeFrom);
  if (row.expiryDate) data.expiryDate = new Date(row.expiryDate);
  return data;
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const payload = await requireRole(req, ['admin', 'staff']);

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

    if (action === 'confirm') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });

      if (jsonData.length > MAX_ROWS) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: `Excel has ${jsonData.length} rows, max allowed is ${MAX_ROWS}` }, { status: 400 }));
      }

      const rows: PreviewRow[] = [];
      const skuList: string[] = [];
      const barcodeList: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const r = parseRow(jsonData[i], i + 2);
        rows.push(r);
        if (r.sku) skuList.push(r.sku);
        if (r.barcode) barcodeList.push(r.barcode);
      }

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

      for (const row of rows) {
        const data = buildCreateData(row);
        const match = (row.barcode && existingByBarcode.get(row.barcode))
          || (row.sku && existingBySku.get(row.sku))
          || null;

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
        const barcodesToCheck = [...new Set(toCreate.map((i) => i.barcode).filter((b): b is string => !!b))];
        if (barcodesToCheck.length > 0) {
          const conflicting = await prisma.product.findMany({
            where: { barcode: { in: barcodesToCheck } },
            select: { id: true, barcode: true, isDeleted: true },
          });
          const conflictBarcodes = new Map(conflicting.map((p) => [p.barcode, { id: p.id, isDeleted: p.isDeleted }]));
          const remaining: Prisma.ProductCreateManyInput[] = [];
          for (const item of toCreate) {
            const conflict = item.barcode ? conflictBarcodes.get(item.barcode) : null;
            if (conflict) {
              const updateData = (item as unknown) as Prisma.ProductUpdateInput;
              if (conflict.isDeleted) (updateData as Record<string, unknown>).isDeleted = false;
              toUpdate.push({ id: conflict.id, data: updateData });
            } else {
              remaining.push(item);
            }
          }
          toCreate.length = 0;
          toCreate.push(...remaining);
        }
        const seenBarcodes = new Set<string | null>();
        const deduped: Prisma.ProductCreateManyInput[] = [];
        for (const item of toCreate) {
          const key = item.barcode ?? null;
          if (key !== null && seenBarcodes.has(key)) {
            skipped++;
            continue;
          }
          if (key !== null) seenBarcodes.add(key);
          deduped.push(item);
        }
        for (let i = 0; i < deduped.length; i += CREATE_BATCH_SIZE) {
          const batch = deduped.slice(i, i + CREATE_BATCH_SIZE);
          let batchCreated = 0;
          try {
            const result = await prisma.product.createMany({ data: batch });
            batchCreated = result.count;
          } catch {
            for (const item of batch) {
              try {
                await prisma.product.create({ data: item as never });
                batchCreated++;
              } catch {
                skipped++;
              }
            }
          }
          created += batchCreated;
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
        newValue: { created, updated, skipped, total: jsonData.length } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: { created, updated, skipped, total: jsonData.length },
      }));
    }

    const parsed = parseExcelSheet(buffer, file.name);

    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: parsed,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 400;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
