-- Tenant Isolation & Schema Hardening Migration
-- 1. Creates the Tenant table and a default tenant.
-- 2. Backfills tenantId on all existing rows.
-- 3. Makes tenantId NOT NULL on all tenant-scoped tables.
-- 4. Replaces global unique constraints with tenant-scoped composites.
-- 5. Adds missing foreign keys and composite indexes.

-- Create Tenant table
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");

-- Create default tenant
INSERT INTO "Tenant" ("id", "name", "slug", "updatedAt") VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'default', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED.name;

-- Backfill tenantId on all tenant-scoped tables
UPDATE "ContactMessage" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "Booking" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "Product" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "Invoice" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "InvoiceItem" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "StockMovement" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "BarcodeScanLog" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "ScannerSession" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "AppSetting" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "Transaction" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "User" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "Customer" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "Vehicle" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "VehicleModel" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "WorkOrder" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "AuditLog" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "JournalEntry" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "Review" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "UniqueVisitor" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "ReminderLog" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "WhatsAppSettings" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "WhatsAppMessageTemplate" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "ReminderSchedule" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "AccountingPeriod" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "InventoryCount" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "InventoryCountItem" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "FeatureFlag" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "TenantFeatureFlag" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "Permission" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;
UPDATE "RolePermission" SET "tenantId" = '00000000-0000-0000-0000-000000000000' WHERE "tenantId" IS NULL;

-- Make tenantId NOT NULL on all tenant-scoped tables
ALTER TABLE "ContactMessage" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InvoiceItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "StockMovement" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BarcodeScanLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ScannerSession" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AppSetting" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "VehicleModel" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "WorkOrder" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "JournalEntry" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "UniqueVisitor" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ReminderLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "WhatsAppSettings" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "WhatsAppMessageTemplate" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ReminderSchedule" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AccountingPeriod" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryCount" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryCountItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FeatureFlag" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TenantFeatureFlag" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Permission" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RolePermission" ALTER COLUMN "tenantId" SET NOT NULL;

-- Replace global unique constraints with tenant-scoped composites
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_barcode_key";
CREATE UNIQUE INDEX "Product_tenantId_barcode_key" ON "Product"("tenantId", "barcode");

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_number_key";
CREATE UNIQUE INDEX "Invoice_tenantId_number_key" ON "Invoice"("tenantId", "number");

ALTER TABLE "VehicleModel" DROP CONSTRAINT IF EXISTS "VehicleModel_name_key";
CREATE UNIQUE INDEX "VehicleModel_tenantId_name_key" ON "VehicleModel"("tenantId", "name");

ALTER TABLE "WhatsAppMessageTemplate" DROP CONSTRAINT IF EXISTS "WhatsAppMessageTemplate_event_key";
CREATE UNIQUE INDEX "WhatsAppMessageTemplate_tenantId_event_key" ON "WhatsAppMessageTemplate"("tenantId", "event");

ALTER TABLE "AppSetting" DROP CONSTRAINT IF EXISTS "AppSetting_key_key";
CREATE UNIQUE INDEX "AppSetting_tenantId_key_key" ON "AppSetting"("tenantId", "key");

ALTER TABLE "FeatureFlag" DROP CONSTRAINT IF EXISTS "FeatureFlag_key_key";
CREATE UNIQUE INDEX "FeatureFlag_tenantId_key_key" ON "FeatureFlag"("tenantId", "key");

ALTER TABLE "Permission" DROP CONSTRAINT IF EXISTS "Permission_key_key";
CREATE UNIQUE INDEX "Permission_tenantId_key_key" ON "Permission"("tenantId", "key");

CREATE UNIQUE INDEX "WhatsAppSettings_tenantId_id_key" ON "WhatsAppSettings"("tenantId", "id");

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_date_time_unique";
CREATE UNIQUE INDEX "Booking_tenantId_date_time_unique" ON "Booking"("tenantId", "date", "time");

ALTER TABLE "ScannerSession" DROP CONSTRAINT IF EXISTS "ScannerSession_token_key";
CREATE UNIQUE INDEX "ScannerSession_tenantId_token_key" ON "ScannerSession"("tenantId", "token");

ALTER TABLE "UniqueVisitor" DROP CONSTRAINT IF EXISTS "UniqueVisitor_ipHash_key";
CREATE UNIQUE INDEX "UniqueVisitor_tenantId_ipHash_key" ON "UniqueVisitor"("tenantId", "ipHash");

-- InvoiceItem uniqueness
CREATE UNIQUE INDEX "InvoiceItem_invoiceId_productId_key" ON "InvoiceItem"("invoiceId", "productId");

-- Add missing foreign keys
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
UPDATE "Transaction" SET "createdById" = "createdBy" WHERE "createdBy" IS NOT NULL AND "createdById" IS NULL;
ALTER TABLE "Transaction" DROP COLUMN "createdBy";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add composite indexes for common tenant-scoped queries
CREATE INDEX "Invoice_tenantId_status_createdAt_idx" ON "Invoice"("tenantId", "status", "createdAt");
CREATE INDEX "Booking_tenantId_date_status_idx" ON "Booking"("tenantId", "date", "status");
CREATE INDEX "Booking_tenantId_status_createdAt_idx" ON "Booking"("tenantId", "status", "createdAt");
CREATE INDEX "WorkOrder_tenantId_status_createdAt_idx" ON "WorkOrder"("tenantId", "status", "createdAt");
CREATE INDEX "Product_tenantId_category_available_idx" ON "Product"("tenantId", "category", "available");
CREATE INDEX "Customer_tenantId_phone_isDeleted_idx" ON "Customer"("tenantId", "phone", "isDeleted");
CREATE INDEX "JournalEntry_tenantId_date_idx" ON "JournalEntry"("tenantId", "date");
CREATE INDEX "FeatureFlag_tenantId_key_idx" ON "FeatureFlag"("tenantId", "key");
CREATE INDEX "Permission_tenantId_key_idx" ON "Permission"("tenantId", "key");
