-- Add composite unique constraints on (id, tenantId) for every tenant-scoped table.
-- This allows the Prisma client extension to safely inject tenantId into id-based
-- unique queries (findUnique/update/delete/upsert) without conflicting with
-- Prisma's strict WhereUniqueInput types. The constraints are safe to add because
-- `id` is already the primary key and therefore unique.

ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "BarcodeScanLog" ADD CONSTRAINT "BarcodeScanLog_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "ScannerSession" ADD CONSTRAINT "ScannerSession_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "User" ADD CONSTRAINT "User_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "TenantFeatureFlag" ADD CONSTRAINT "TenantFeatureFlag_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Review" ADD CONSTRAINT "Review_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "UniqueVisitor" ADD CONSTRAINT "UniqueVisitor_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "WhatsAppSettings" ADD CONSTRAINT "WhatsAppSettings_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "WhatsAppMessageTemplate" ADD CONSTRAINT "WhatsAppMessageTemplate_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_id_tenantId_key" UNIQUE ("id", "tenantId");
