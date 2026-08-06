-- Tenant isolation regression fix.
--
-- 20260628130000_add_tenant_isolation replaced global unique constraints with
-- tenant-scoped composite uniques, but attempted the removal with
-- `ALTER TABLE ... DROP CONSTRAINT IF EXISTS "<name>_key"`. Prisma 6 creates
-- @unique as a unique INDEX (`CREATE UNIQUE INDEX "<name>_key"`), not a table
-- constraint, so those drops silently no-oped and the stale global indexes kept
-- enforcing cross-tenant uniqueness: two tenants could never share the same
-- booking slot, product barcode, model name, settings/feature/permission key,
-- or scanner token. The tenant-scoped unique indexes already exist
-- (e.g. "Booking_tenantId_date_time_unique", "Product_tenantId_barcode_key");
-- remove the stale global ones.

DROP INDEX IF EXISTS "Booking_date_time_key";
DROP INDEX IF EXISTS "Product_barcode_key";
DROP INDEX IF EXISTS "VehicleModel_name_key";
DROP INDEX IF EXISTS "AppSetting_key_key";
DROP INDEX IF EXISTS "FeatureFlag_key_key";
DROP INDEX IF EXISTS "Permission_key_key";
DROP INDEX IF EXISTS "ScannerSession_token_key";
