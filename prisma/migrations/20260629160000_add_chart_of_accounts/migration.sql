-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "type" "AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");
CREATE INDEX "Account_code_idx" ON "Account"("code");
CREATE INDEX "Account_parentId_idx" ON "Account"("parentId");
CREATE INDEX "Account_isActive_idx" ON "Account"("isActive");
CREATE INDEX "Account_isDeleted_idx" ON "Account"("isDeleted");
CREATE INDEX "Account_tenantId_idx" ON "Account"("tenantId");
CREATE UNIQUE INDEX "Account_tenantId_code_key" ON "Account"("tenantId", "code");
CREATE UNIQUE INDEX "Account_id_tenantId_key" ON "Account"("id", "tenantId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add debitAccountId and creditAccountId to JournalEntry
ALTER TABLE "JournalEntry" ADD COLUMN "debitAccountId" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN "creditAccountId" TEXT;

-- CreateIndex for new columns
CREATE INDEX "JournalEntry_debitAccountId_idx" ON "JournalEntry"("debitAccountId");
CREATE INDEX "JournalEntry_creditAccountId_idx" ON "JournalEntry"("creditAccountId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
