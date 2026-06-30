-- Create WorkOrderPart model
CREATE TABLE "WorkOrderPart" (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "workOrderId" TEXT NOT NULL REFERENCES "WorkOrder"(id) ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"(id),
    quantity INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT
);

-- Create WorkOrderLabour model
CREATE TABLE "WorkOrderLabour" (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "workOrderId" TEXT NOT NULL REFERENCES "WorkOrder"(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hours DECIMAL(5,2),
    rate DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT
);

-- Indexes for WorkOrderPart
CREATE INDEX "WorkOrderPart_workOrderId_idx" ON "WorkOrderPart"("workOrderId");
CREATE INDEX "WorkOrderPart_productId_idx" ON "WorkOrderPart"("productId");
CREATE INDEX "WorkOrderPart_isDeleted_idx" ON "WorkOrderPart"("isDeleted");
CREATE INDEX "WorkOrderPart_tenantId_idx" ON "WorkOrderPart"("tenantId");

-- Indexes for WorkOrderLabour
CREATE INDEX "WorkOrderLabour_workOrderId_idx" ON "WorkOrderLabour"("workOrderId");
CREATE INDEX "WorkOrderLabour_isDeleted_idx" ON "WorkOrderLabour"("isDeleted");
CREATE INDEX "WorkOrderLabour_tenantId_idx" ON "WorkOrderLabour"("tenantId");
