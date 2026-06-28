export interface Product {
  id: string;
  name: string;
  nameAr: string | null;
  barcode: string | null;
  price: number;
  stock: number;
  category: string;
  image: string | null;
  available: boolean;
}

export interface CartItem {
  productId: string;
  barcode: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  type: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  items: InvoiceItem[];
  createdBy: { id: string; username: string };
  createdAt: string;
}

export interface TreasuryData {
  todaySales: number;
  todayCount: number;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  todayDiscount: number;
  todayTax: number;
}
