-- AlterTable
ALTER TABLE "WhatsAppMessageTemplate" ADD COLUMN     "deletedAt" TIMESTAMP(6),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
