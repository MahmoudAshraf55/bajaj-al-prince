-- Fix multi-tenant WhatsApp settings/templates.
-- WhatsAppSettings: replace the globally-unique PK on (id) with a composite
-- tenant-scoped PK so each tenant can own its own 'default' row.
ALTER TABLE "WhatsAppSettings" DROP CONSTRAINT "WhatsAppSettings_id_tenantId_key";
DROP INDEX "WhatsAppSettings_tenantId_id_key";
ALTER TABLE "WhatsAppSettings" DROP CONSTRAINT "WhatsAppSettings_pkey";
ALTER TABLE "WhatsAppSettings" ADD CONSTRAINT "WhatsAppSettings_pkey" PRIMARY KEY ("tenantId", "id");

-- WhatsAppMessageTemplate: drop the globally-unique constraint on (event).
-- Tenant scoping is already enforced by WhatsAppMessageTemplate_tenantId_event_key.
DROP INDEX "WhatsAppMessageTemplate_event_key";
