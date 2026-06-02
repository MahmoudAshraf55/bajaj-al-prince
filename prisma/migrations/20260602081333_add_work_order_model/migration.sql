-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cost" DECIMAL(10,2),
    "vehicleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_vehicleId_idx" ON "WorkOrder"("vehicleId");

-- CreateIndex
CREATE INDEX "WorkOrder_isDeleted_idx" ON "WorkOrder"("isDeleted");

-- CreateIndex
CREATE INDEX "WorkOrder_tenantId_idx" ON "WorkOrder"("tenantId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
