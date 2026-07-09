---
name: prisma-tenant-enforcement
description: استخدم عند تنفيذ أي Query أو API Route. فرض عزل الـ tenant.
---

# Prisma Tenant Enforcement Rules
- يجب دائماً التأكد من أن الـ Query تستخدم الـ Extended Prisma Client.
- أي Query للـ Tenant يجب أن تستخدم الـ `rawPrisma` لضمان عدم حدوث Auto-injection للـ `tenantId`.
- عند استخدام `findMany`, `create`, `update` تأكد من تطبيق الـ Soft-delete filter إذا لزم الأمر.
- لا تضف `tenantId` يدوياً إذا كان الـ Extension يغطي العملية.
