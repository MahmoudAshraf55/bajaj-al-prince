/*
  Warnings:

  - Made the column `updatedAt` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ReminderLog" DROP CONSTRAINT "ReminderLog_bookingId_fkey";

-- DropIndex
DROP INDEX "Customer_name_idx";

-- DropIndex
DROP INDEX "Customer_phone_idx";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "return_invoice_id" TEXT,
ADD COLUMN     "workOrderId" TEXT;

-- AlterTable
ALTER TABLE "JournalEntry" ALTER COLUMN "date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockInventory" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_workOrderId_idx" ON "Invoice"("workOrderId");

-- CreateIndex
CREATE INDEX "Invoice_return_invoice_id_idx" ON "Invoice"("return_invoice_id");

-- CreateIndex
CREATE INDEX "Product_isService_idx" ON "Product"("isService");

-- CreateIndex
CREATE INDEX "WorkOrder_bookingId_idx" ON "WorkOrder"("bookingId");

-- CreateIndex
CREATE INDEX "WorkOrder_invoiceId_idx" ON "WorkOrder"("invoiceId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
