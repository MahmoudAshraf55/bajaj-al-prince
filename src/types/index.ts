export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface BookingFormData {
  name: string;
  email?: string;
  phone: string;
  model: string;
  issue: string;
  date: string;
  time: string;
  make?: string;
  year?: number;
  plateNumber?: string;
  chassisNumber?: string;
  customerId?: string;
  vehicleId?: string;
}

export interface ProductData {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
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
  activeFrom: string | null;
  expiryDate: string | null;
}

export type InvoiceType = 'sale' | 'purchase' | 'return';
export type InvoiceStatus = 'draft' | 'confirmed' | 'cancelled';

export interface Invoice {
  id: string;
  number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string | null;
  notes: string | null;
  customerId: string | null;
  customerName: string | null;
  createdById: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string | null;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  barcode: string | null;
  productName: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  total: number;
}

export type MovementType = 'in' | 'out' | 'adjustment';

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
}

export type ScanSource = 'HH400' | 'MobileCamera' | 'Webcam';
export type ScanStatus = 'success' | 'not_found' | 'error';

export interface BarcodeScanLog {
  id: string;
  barcode: string;
  source: ScanSource;
  userId: string | null;
  invoiceId: string | null;
  productId: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  status: ScanStatus;
  createdAt: string;
}

export interface ScannerSession {
  id: string;
  token: string;
  deviceName: string | null;
  ipAddress: string | null;
  pin: string | null;
  status: string;
  createdById: string;
  createdAt: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: string;
}

export interface TransactionData {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  model: string;
  issue: string;
  date: string;
  time: string;
  status: string;
  plateNumber: string | null;
  customerId: string | null;
  vehicleId: string | null;
  customer?: Customer | null;
  vehicle?: Vehicle | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  vehicles: Vehicle[];
  bookings: Booking[];
  invoices: Invoice[];
  createdAt: string;
  updatedAt: string | null;
  _count?: { vehicles: number; bookings?: number; invoices?: number };
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  chassisNumber: string | null;
  plateNumber: string | null;
  customerId: string;
  customer?: Customer;
  bookings?: Booking[];
  workOrders?: WorkOrder[];
  createdAt: string;
  updatedAt: string | null;
}

export interface VehicleModel {
  id: string;
  name: string;
  make: string;
  isActive: boolean;
  manufacturerId: string | null;
  manufacturer?: { id: string; name: string; nameAr: string | null } | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface WorkOrderPart {
  id: string;
  workOrderId: string;
  productId: string;
  product?: { id: string; name: string; barcode: string | null };
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
}

export interface WorkOrderLabour {
  id: string;
  workOrderId: string;
  description: string;
  hours: number | null;
  rate: number | null;
  total: number;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  description: string;
  status: string;
  cost: number | null;
  vehicleId: string;
  vehicle?: Vehicle;
  parts?: WorkOrderPart[];
  labourLines?: WorkOrderLabour[];
  createdAt: string;
  updatedAt: string | null;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
  updatedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  review: string;
  date: string;
  avatar: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface WhatsAppSettings {
  id: string;
  delayMin: number;
  delayMax: number;
  dailyCap: number;
  batchSize: number;
}

export interface WhatsAppMessageTemplate {
  id: string;
  event: string;
  message: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ReminderSchedule {
  id: string;
  name: string;
  intervalDays: number;
  message: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderLog {
  id: string;
  customerId: string;
  bookingId: string | null;
  phone: string;
  message: string;
  status: string;
  sentAt: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff' | 'viewer';
  failedAttempts: number;
  lockedUntil: string | null;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string | null;
}

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
};

// Accounting types
export type AccountingPeriod = 'day' | 'month' | 'quarter' | 'year';

export interface AccountingSummary {
  period: { from: string; to: string; label: string };
  revenue: number;          // sale invoices total
  returns: number;          // return invoices total
  netSales: number;         // revenue - returns
  cogs: number;             // cost of goods sold
  grossProfit: number;      // netSales - cogs
  grossMargin: number;      // percentage
  expenses: number;         // purchases + manual expenses + work order costs
  discounts: number;        // invoice discounts
  taxes: number;            // invoice taxes
  netProfit: number;        // grossProfit - expenses - discounts
  netMargin: number;        // percentage
  byPaymentMethod: { method: string; amount: number; count: number }[];
  byCategory: { category: string; revenue: number; cogs: number; profit: number }[];
  invoiceCount: number;
}

export interface AccountingTransaction {
  id: string;
  type: string;             // SALE | RETURN | PURCHASE | EXPENSE | INCOME | STOCK_ADJUSTMENT
  amount: number;
  description: string | null;
  referenceNumber: string | null;
  referenceType: string | null;
  referenceId: string | null;
  category: string | null;
  paymentMethod: string | null;
  date: string;
  createdById: string;
}
