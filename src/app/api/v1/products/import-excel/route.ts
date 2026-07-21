import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, getClientInfo } from '@/lib/audit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import type { ImportPreviewRow, ImportRowDiff, ImportDecision } from '@/types/warehouse';

const MAX_ROWS = 20000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const UPDATE_BATCH_SIZE = 100;
const CREATE_BATCH_SIZE = 500;

export const maxDuration = 60;

function isValidDateStr(val: string): boolean {
  if (!val) return false;
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  return year >= 1900 && year <= 2100;
}

function normalizeRow(row: Record<string, string | number>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase()] = v;
  }
  return out;
}

function colVal(row: Record<string, string | number>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key] ?? row[key.toLowerCase()];
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

function parseRow(row: Record<string, string | number>, rowNum: number): ImportPreviewRow {
  const partsSku = colVal(row,
    'Parts', 'SKU', 'sku', 'Part Number', 'part_number',
    'كود', 'الكود', 'رقم القطعة', 'رمز المنتج', 'كود المنتج',
    'Code', 'code',
  );
  const barcodeVal = colVal(row,
    'parts.1', 'Barcode', 'باركود', 'barcode',
    'الباركود', 'كود الباركود', 'باركود',
    'Bar Code', 'bar_code', 'parts',
  ) || partsSku;

  return {
    row: rowNum,
    sku: partsSku || null,
    barcode: barcodeVal || null,
    name: colVal(row,
      'en', 'English Name', 'name', 'Name',
      'الاسم', 'اسم المنتج', 'اسم الصنف', 'product name',
      'Product Name', 'product_name',
    ) || `Product ${rowNum}`,
    nameAr: colVal(row,
      'ar', 'Arabic Name', 'nameAr', 'name_ar',
      'الاسم العربي', 'اسم عربي',
    ) || null,
    vehicleModel: colVal(row,
      'mod', 'Model', 'vehicleModel', 'vehicle_model',
      'موديل', 'الموديل', 'طراز',
    ) || null,
    category: colVal(row,
      'cat', 'Category', 'category',
      'تصنيف', 'الفئة', 'القسم',
    ) || 'Spare Parts',
    price: parseNum(row,
      'مستهلك بالضريبة', 'price', 'سعر', 'Price', 'Price (EGP)', 'Unit Price', 'السعر', 'unit_price', 'unitPrice',
      'سعر البيع', 'سعر المنتج', 'السعر النهائي', 'سعر الوحدة', 'السعر بالضريبة', 'مستهلك', 'سعر مستهلك',
      'بيع', 'سعر البيع النهائي', 'سعر عام', 'السعر العام', 'Retail Price', 'القيمة',
      'السعر (ج.م)', 'سعر البيع (ج.م)', 'سعر المنتج (ج.م)',
    ),
    costPrice: parseNum(row,
      'cost', 'Cost', 'Cost Price', 'Unit Cost', 'تكلفة', 'costPrice', 'سعر الشراء', 'سعر التكلفة', 'cost_price',
      'التكلفة', 'المشتريات', 'سعر التكلفة الفعلي', 'سعر الجملة', 'سعر جملة', 'تكلفة الشراء', 'شراء',
      'Wholesale', 'wholesale', 'Purchase Price', 'سعر الشراء جملة', 'سعر التكلفة (ج.م)',
    ),
    stock: parseNum(row,
      'stock', 'Stock', 'Stock Qty', 'مخزون', 'quantity', 'Qty', 'qty', 'الكمية',
      'الرصيد', 'الكمية المتاحة', 'المتوفر', 'مخزون حالي', 'العدد', 'عدد', 'كمية', 'المخزون الحالي',
      'On Hand', 'Available', 'Balance', 'الكميه', 'stock quantity',
    ),
    unit: colVal(row,
      'unit', 'Unit', 'وحدة', 'UOM', 'الوحدة',
      'وحدة القياس', 'القياس', 'الوحده', 'قطعة', 'حبة',
    ) || null,
    description: colVal(row,
      'desc', 'Description', 'description', 'وصف', 'Notes', 'ملاحظات', 'الوصف',
      'البيان', 'تفاصيل', 'بيان', 'شرح', 'مواصفات', 'ملاحظه',
    ) || null,
    activeFrom: parseDateStr(row,
      'Start Date Active', 'activeFrom', 'date', 'Date',
      'تاريخ البدء', 'تاريخ الفعالية', 'بداية',
    ),
    expiryDate: parseDateStr(row,
      'Expiry', 'expiryDate', 'expiry', 'صلاحية',
      'تاريخ الانتهاء', 'تاريخ الصلاحية', 'نهاية',
    ),
    isNew: true,
    existingProductId: null,
    existingStock: null,
    diffs: [],
  };
}

function buildCreateData(row: ImportPreviewRow): Prisma.ProductCreateManyInput {
  const data: Prisma.ProductCreateManyInput = {
    name: row.name,
    nameAr: row.nameAr,
    sku: row.sku,
    barcode: row.barcode,
    vehicleModel: row.vehicleModel,
    category: row.category || 'Spare Parts',
    price: row.price ?? 0,
    stock: row.stock ?? 1,
    tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
  };
  if (row.costPrice != null) data.costPrice = row.costPrice;
  if (row.unit) data.unit = row.unit;
  if (row.description) data.description = row.description;
  if (row.activeFrom) data.activeFrom = new Date(row.activeFrom);
  if (row.expiryDate) data.expiryDate = new Date(row.expiryDate);
  return data;
}

function computeDiffs(row: ImportPreviewRow, existing: { stock: number; price: number; costPrice: number | null }): ImportRowDiff[] {
  const diffs: ImportRowDiff[] = [];

  if (row.stock != null && row.stock > 0) {
    const newStock = existing.stock + row.stock;
    diffs.push({ field: 'stock', oldValue: existing.stock, newValue: newStock });
  }

  if (row.price != null && row.price > 0 && row.price !== existing.price) {
    diffs.push({ field: 'price', oldValue: existing.price, newValue: row.price });
  }

  if (row.costPrice != null && row.costPrice > 0 && row.costPrice !== existing.costPrice) {
    diffs.push({ field: 'costPrice', oldValue: existing.costPrice, newValue: row.costPrice });
  }

  return diffs;
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {

      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const action = (formData.get('action') as string) || 'preview';
      const decisionsJson = formData.get('decisions') as string | null;

      if (!file) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 }));
      }

      if (file.size > MAX_FILE_SIZE) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 400 }));
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });

      if (jsonData.length === 0) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Excel file is empty' }, { status: 400 }));
      }
      if (jsonData.length > MAX_ROWS) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: `Excel has ${jsonData.length} rows, max allowed is ${MAX_ROWS}` }, { status: 400 }));
      }

      const headers = Object.keys(jsonData[0]);
      const rows: ImportPreviewRow[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        rows.push(parseRow(normalizeRow(jsonData[i]), i + 2));
      }

      // Collect unique barcodes from parsed rows for DB lookup
      const barcodeList = [...new Set(rows.map(r => r.barcode).filter((b): b is string => !!b))];

      const existingProducts = barcodeList.length > 0
        ? await prisma.product.findMany({
            where: { barcode: { in: barcodeList }, isDeleted: false },
            select: { id: true, barcode: true, sku: true, stock: true, price: true, costPrice: true },
          })
        : [];

      const existingByBarcode = new Map(existingProducts.map(p => [p.barcode, {
        id: p.id,
        barcode: p.barcode,
        sku: p.sku,
        stock: p.stock,
        price: Number(p.price),
        costPrice: p.costPrice ? Number(p.costPrice) : null,
      }]));

      // Enrich rows with existing product data and diffs
      let newCount = 0;
      let existingCount = 0;

      for (const row of rows) {
        const match = row.barcode ? existingByBarcode.get(row.barcode) : null;
        if (match) {
          row.isNew = false;
          row.existingProductId = match.id;
          row.existingStock = match.stock;
          row.diffs = computeDiffs(row, match);
          existingCount++;
        } else {
          newCount++;
        }
      }

      // Preview: return enriched data
      if (action === 'preview') {
        const sheetCategories = [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))];
        const missingDataCount = rows.filter((r) => (r.price === null || r.price <= 0) && r.stock === null).length;

        return withSecurityHeaders(NextResponse.json({
          success: true,
          data: {
            headers,
            rows: rows.slice(0, 20),
            totalRows: rows.length,
            fileName: file.name,
            sheetCategories,
            missingDataCount,
            newCount,
            existingCount,
          },
        }));
      }

      // Confirm: apply based on admin decisions
      if (action === 'confirm') {
        let decisions: Map<string, ImportDecision> = new Map();

        if (decisionsJson) {
          try {
            const parsed = JSON.parse(decisionsJson) as ImportDecision[];
            decisions = new Map(parsed.map(d => [d.barcode, d]));
          } catch {
            return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invalid decisions format' }, { status: 400 }));
          }
        }

        const toCreate: Prisma.ProductCreateManyInput[] = [];
        const toUpdate: { id: string; data: Prisma.ProductUpdateInput }[] = [];
        let skipped = 0;

        for (const row of rows) {
          if (row.isNew) {
            toCreate.push(buildCreateData(row));
            continue;
          }

          const existing = row.existingProductId ? existingByBarcode.get(row.barcode ?? '') : null;
          if (!existing) {
            toCreate.push(buildCreateData(row));
            continue;
          }

          const decision = row.barcode ? decisions.get(row.barcode) : null;
          const actionType = decision?.action || 'stock_only';

          if (actionType === 'update') {
            const updateData: Prisma.ProductUpdateInput = {};
            if (row.price != null && row.price > 0) updateData.price = row.price;
            if (row.costPrice != null && row.costPrice > 0) updateData.costPrice = row.costPrice;
            if (row.stock != null && row.stock > 0) updateData.stock = existing.stock + row.stock;
            if (row.name) updateData.name = row.name;
            if (row.nameAr) updateData.nameAr = row.nameAr;
            if (row.unit) updateData.unit = row.unit;
            if (row.description) updateData.description = row.description;
            if (row.vehicleModel) updateData.vehicleModel = row.vehicleModel;
            if (row.category) updateData.category = row.category;
            if (row.sku) updateData.sku = row.sku;
            if (row.activeFrom) updateData.activeFrom = new Date(row.activeFrom);
            if (row.expiryDate) updateData.expiryDate = new Date(row.expiryDate);
            toUpdate.push({ id: existing.id, data: updateData });
          } else {
            if (row.stock != null && row.stock > 0) {
              toUpdate.push({ id: existing.id, data: { stock: existing.stock + row.stock } });
            }
          }
        }

        // Deduplicate creates by barcode
        const seenBarcodes = new Set<string | null>();
        const dedupedCreate: Prisma.ProductCreateManyInput[] = [];
        for (const item of toCreate) {
          const key = item.barcode ?? null;
          if (key !== null && seenBarcodes.has(key)) {
            skipped++;
            continue;
          }
          if (key !== null) seenBarcodes.add(key);
          dedupedCreate.push(item);
        }

        let created = 0;
        let updated = 0;

        if (dedupedCreate.length > 0) {
          for (let i = 0; i < dedupedCreate.length; i += CREATE_BATCH_SIZE) {
            const batch = dedupedCreate.slice(i, i + CREATE_BATCH_SIZE);
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

      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : message === 'Forbidden' ? 403 : 400;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
