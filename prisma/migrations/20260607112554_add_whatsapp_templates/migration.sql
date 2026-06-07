-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "review" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "avatar" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniqueVisitor" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "UniqueVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "tenantId" TEXT,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "delayMin" INTEGER NOT NULL DEFAULT 60,
    "delayMax" INTEGER NOT NULL DEFAULT 120,
    "dailyCap" INTEGER NOT NULL DEFAULT 50,
    "batchSize" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "tenantId" TEXT,

    CONSTRAINT "WhatsAppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessageTemplate" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "tenantId" TEXT,

    CONSTRAINT "WhatsAppMessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "Review_isDeleted_idx" ON "Review"("isDeleted");

-- CreateIndex
CREATE INDEX "Review_tenantId_idx" ON "Review"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UniqueVisitor_ipHash_key" ON "UniqueVisitor"("ipHash");

-- CreateIndex
CREATE INDEX "UniqueVisitor_createdAt_idx" ON "UniqueVisitor"("createdAt");

-- CreateIndex
CREATE INDEX "UniqueVisitor_isDeleted_idx" ON "UniqueVisitor"("isDeleted");

-- CreateIndex
CREATE INDEX "UniqueVisitor_tenantId_idx" ON "UniqueVisitor"("tenantId");

-- CreateIndex
CREATE INDEX "ReminderLog_customerId_idx" ON "ReminderLog"("customerId");

-- CreateIndex
CREATE INDEX "ReminderLog_sentAt_idx" ON "ReminderLog"("sentAt");

-- CreateIndex
CREATE INDEX "ReminderLog_isDeleted_idx" ON "ReminderLog"("isDeleted");

-- CreateIndex
CREATE INDEX "ReminderLog_tenantId_idx" ON "ReminderLog"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppSettings_tenantId_idx" ON "WhatsAppSettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessageTemplate_event_key" ON "WhatsAppMessageTemplate"("event");

-- CreateIndex
CREATE INDEX "WhatsAppMessageTemplate_tenantId_idx" ON "WhatsAppMessageTemplate"("tenantId");
