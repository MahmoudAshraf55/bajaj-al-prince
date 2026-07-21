export interface WarehouseProduct {
  id: string;
  name: string;
  nameAr: string | null;
  barcode: string | null;
  sku: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  category: string;
  vehicleModel: string | null;
  image: string | null;
  available: boolean;
  taxExempt: boolean;
  taxRate: number | null;
  description: string | null;
  activeFrom: string | null;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; username: string };
  product: { id: string; name: string; barcode: string | null };
}

export interface ImportRowDiff {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface ImportPreviewRow {
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
  activeFrom: string | null;
  expiryDate: string | null;
  isNew: boolean;
  existingProductId: string | null;
  existingStock: number | null;
  diffs: ImportRowDiff[];
}

export interface ImportPreview {
  headers: string[];
  rows: ImportPreviewRow[];
  totalRows: number;
  fileName: string;
  sheetCategories?: string[];
  missingDataCount?: number;
  newCount: number;
  existingCount: number;
}

export interface ImportDecision {
  row: number;
  barcode: string;
  action: 'update' | 'stock_only';
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}
