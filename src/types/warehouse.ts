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

export interface ImportPreview {
  headers: string[];
  preview: Array<Record<string, unknown>>;
  totalRows: number;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}
