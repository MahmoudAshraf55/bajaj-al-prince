-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "make" TEXT NOT NULL DEFAULT 'Bajaj',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_name_key" ON "VehicleModel"("name");

-- CreateIndex
CREATE INDEX "VehicleModel_isActive_idx" ON "VehicleModel"("isActive");

-- CreateIndex
CREATE INDEX "VehicleModel_isDeleted_idx" ON "VehicleModel"("isDeleted");

-- CreateIndex
CREATE INDEX "VehicleModel_tenantId_idx" ON "VehicleModel"("tenantId");
