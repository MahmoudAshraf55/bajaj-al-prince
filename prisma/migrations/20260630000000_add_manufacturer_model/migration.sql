-- Create Manufacturer model
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- Add manufacturerId to VehicleModel
ALTER TABLE "VehicleModel" ADD COLUMN "manufacturerId" TEXT;

-- Create indexes
CREATE INDEX "Manufacturer_isActive_idx" ON "Manufacturer"("isActive");
CREATE INDEX "Manufacturer_isDeleted_idx" ON "Manufacturer"("isDeleted");
CREATE INDEX "Manufacturer_tenantId_idx" ON "Manufacturer"("tenantId");
CREATE UNIQUE INDEX "Manufacturer_tenantId_name_key" ON "Manufacturer"("tenantId", "name");
CREATE UNIQUE INDEX "Manufacturer_id_tenantId_key" ON "Manufacturer"("id", "tenantId");
CREATE INDEX "VehicleModel_manufacturerId_idx" ON "VehicleModel"("manufacturerId");

-- Add foreign key
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_manufacturerId_fkey"
    FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
