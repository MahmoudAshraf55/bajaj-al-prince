-- Feature Flags & RBAC Foundation Migration
-- Adds FeatureFlag, TenantFeatureFlag, Permission, and RolePermission tables.
-- All changes are additive; no existing data is modified.

-- Create FeatureFlag table
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");
CREATE INDEX "FeatureFlag_category_idx" ON "FeatureFlag"("category");
CREATE INDEX "FeatureFlag_isDeleted_idx" ON "FeatureFlag"("isDeleted");
CREATE INDEX "FeatureFlag_tenantId_idx" ON "FeatureFlag"("tenantId");

-- Create TenantFeatureFlag table
CREATE TABLE "TenantFeatureFlag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "TenantFeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantFeatureFlag_tenantId_featureId_key" ON "TenantFeatureFlag"("tenantId", "featureId");
CREATE INDEX "TenantFeatureFlag_tenantId_idx" ON "TenantFeatureFlag"("tenantId");
CREATE INDEX "TenantFeatureFlag_featureId_idx" ON "TenantFeatureFlag"("featureId");
CREATE INDEX "TenantFeatureFlag_isDeleted_idx" ON "TenantFeatureFlag"("isDeleted");
ALTER TABLE "TenantFeatureFlag" ADD CONSTRAINT "TenantFeatureFlag_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureFlag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create Permission table
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE INDEX "Permission_key_idx" ON "Permission"("key");
CREATE INDEX "Permission_category_idx" ON "Permission"("category");
CREATE INDEX "Permission_isDeleted_idx" ON "Permission"("isDeleted");
CREATE INDEX "Permission_tenantId_idx" ON "Permission"("tenantId");

-- Create RolePermission table
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
CREATE INDEX "RolePermission_isDeleted_idx" ON "RolePermission"("isDeleted");
CREATE INDEX "RolePermission_tenantId_idx" ON "RolePermission"("tenantId");
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
