-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('sale', 'purchase', 'return');
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'confirmed', 'cancelled');
CREATE TYPE "MovementType" AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE "ScanSource" AS ENUM ('HH400', 'MobileCamera', 'Webcam');
CREATE TYPE "ScanStatus" AS ENUM ('success', 'not_found', 'error');
CREATE TYPE "PeriodStatus" AS ENUM ('open', 'closed', 'locked');
CREATE TYPE "CountSheetStatus" AS ENUM ('draft', 'in_progress', 'completed', 'cancelled');

-- AlterTable: Add missing columns to Product
ALTER TABLE "Product" ADD COLUMN "nameAr" TEXT,
ADD COLUMN "barcode" TEXT,
ADD COLUMN "sku" TEXT,
ADD COLUMN "costPrice" DECIMAL(10,2),
ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'piece',
ADD COLUMN "vehicleModel" TEXT,
ADD COLUMN "taxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "activeFrom" TIMESTAMP(6),
ADD COLUMN "expiryDate" TIMESTAMP(6);

-- AlterTable: Add missing indexes for Product
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- AlterTable: Fix Customer phone nullability, add email index
ALTER TABLE "Customer" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "email" SET NOT NULL;
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateTable: Invoice
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL DEFAULT 'sale',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "change" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvoiceItem
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "barcode" TEXT,
    "productName" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StockMovement
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BarcodeScanLog
CREATE TABLE "BarcodeScanLog" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "source" "ScanSource" NOT NULL,
    "userId" TEXT,
    "invoiceId" TEXT,
    "productId" TEXT,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "status" "ScanStatus" NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "BarcodeScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ScannerSession
CREATE TABLE "ScannerSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "pin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "ScannerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AppSetting
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "tenantId" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AccountingPeriod
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'open',
    "closedById" TEXT,
    "closedAt" TIMESTAMP(6),
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InventoryCount
CREATE TABLE "InventoryCount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CountSheetStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InventoryCountItem
CREATE TABLE "InventoryCountItem" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "actualQty" INTEGER NOT NULL DEFAULT 0,
    "variance" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "InventoryCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for Invoice
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_number_idx" ON "Invoice"("number");
CREATE INDEX "Invoice_type_idx" ON "Invoice"("type");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_createdById_idx" ON "Invoice"("createdById");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
CREATE INDEX "Invoice_isDeleted_idx" ON "Invoice"("isDeleted");
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndexes for InvoiceItem
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");
CREATE INDEX "InvoiceItem_createdAt_idx" ON "InvoiceItem"("createdAt");
CREATE INDEX "InvoiceItem_isDeleted_idx" ON "InvoiceItem"("isDeleted");
CREATE INDEX "InvoiceItem_tenantId_idx" ON "InvoiceItem"("tenantId");

-- CreateIndexes for StockMovement
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");
CREATE INDEX "StockMovement_createdById_idx" ON "StockMovement"("createdById");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
CREATE INDEX "StockMovement_isDeleted_idx" ON "StockMovement"("isDeleted");
CREATE INDEX "StockMovement_tenantId_idx" ON "StockMovement"("tenantId");

-- CreateIndexes for BarcodeScanLog
CREATE INDEX "BarcodeScanLog_barcode_idx" ON "BarcodeScanLog"("barcode");
CREATE INDEX "BarcodeScanLog_source_idx" ON "BarcodeScanLog"("source");
CREATE INDEX "BarcodeScanLog_userId_idx" ON "BarcodeScanLog"("userId");
CREATE INDEX "BarcodeScanLog_invoiceId_idx" ON "BarcodeScanLog"("invoiceId");
CREATE INDEX "BarcodeScanLog_productId_idx" ON "BarcodeScanLog"("productId");
CREATE INDEX "BarcodeScanLog_createdAt_idx" ON "BarcodeScanLog"("createdAt");
CREATE INDEX "BarcodeScanLog_isDeleted_idx" ON "BarcodeScanLog"("isDeleted");
CREATE INDEX "BarcodeScanLog_tenantId_idx" ON "BarcodeScanLog"("tenantId");

-- CreateIndexes for ScannerSession
CREATE UNIQUE INDEX "ScannerSession_token_key" ON "ScannerSession"("token");
CREATE INDEX "ScannerSession_token_idx" ON "ScannerSession"("token");
CREATE INDEX "ScannerSession_status_idx" ON "ScannerSession"("status");
CREATE INDEX "ScannerSession_createdById_idx" ON "ScannerSession"("createdById");
CREATE INDEX "ScannerSession_createdAt_idx" ON "ScannerSession"("createdAt");
CREATE INDEX "ScannerSession_isDeleted_idx" ON "ScannerSession"("isDeleted");
CREATE INDEX "ScannerSession_tenantId_idx" ON "ScannerSession"("tenantId");

-- CreateIndexes for AppSetting
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");
CREATE INDEX "AppSetting_key_idx" ON "AppSetting"("key");
CREATE INDEX "AppSetting_tenantId_idx" ON "AppSetting"("tenantId");

-- CreateIndexes for AccountingPeriod
CREATE UNIQUE INDEX "AccountingPeriod_startDate_tenantId_key" ON "AccountingPeriod"("startDate", "tenantId");
CREATE INDEX "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");
CREATE INDEX "AccountingPeriod_startDate_idx" ON "AccountingPeriod"("startDate");
CREATE INDEX "AccountingPeriod_isDeleted_idx" ON "AccountingPeriod"("isDeleted");
CREATE INDEX "AccountingPeriod_tenantId_idx" ON "AccountingPeriod"("tenantId");

-- CreateIndexes for InventoryCount
CREATE INDEX "InventoryCount_status_idx" ON "InventoryCount"("status");
CREATE INDEX "InventoryCount_createdById_idx" ON "InventoryCount"("createdById");
CREATE INDEX "InventoryCount_createdAt_idx" ON "InventoryCount"("createdAt");
CREATE INDEX "InventoryCount_isDeleted_idx" ON "InventoryCount"("isDeleted");
CREATE INDEX "InventoryCount_tenantId_idx" ON "InventoryCount"("tenantId");

-- CreateIndexes for InventoryCountItem
CREATE UNIQUE INDEX "InventoryCountItem_countId_productId_key" ON "InventoryCountItem"("countId", "productId");
CREATE INDEX "InventoryCountItem_countId_idx" ON "InventoryCountItem"("countId");
CREATE INDEX "InventoryCountItem_productId_idx" ON "InventoryCountItem"("productId");
CREATE INDEX "InventoryCountItem_isDeleted_idx" ON "InventoryCountItem"("isDeleted");
CREATE INDEX "InventoryCountItem_tenantId_idx" ON "InventoryCountItem"("tenantId");

-- AddForeignKey for Invoice
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for InvoiceItem
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for StockMovement
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for BarcodeScanLog
ALTER TABLE "BarcodeScanLog" ADD CONSTRAINT "BarcodeScanLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BarcodeScanLog" ADD CONSTRAINT "BarcodeScanLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BarcodeScanLog" ADD CONSTRAINT "BarcodeScanLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for ScannerSession
ALTER TABLE "ScannerSession" ADD CONSTRAINT "ScannerSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for AccountingPeriod
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for InventoryCount
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for InventoryCountItem
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
