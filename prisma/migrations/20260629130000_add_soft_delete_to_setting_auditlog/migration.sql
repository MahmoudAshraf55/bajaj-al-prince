-- Add soft-delete columns to AppSetting and AuditLog so the tenant-aware Prisma
-- extension can consistently apply `isDeleted: false` to all tenant-scoped
-- filter queries without special-casing models.
ALTER TABLE "AppSetting" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppSetting" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(6);

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(6);
