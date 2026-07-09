---
name: ci-check-procedure
description: استخدم قبل أي Git Push أو PR. التأكد من سلامة الكود.
---

# CI Check Procedure
قبل أي تغيير أو رفع للكود، تأكد من تنفيذ الآتي:
1. `npx tsc --noEmit` (فحص الأخطاء النوعية)
2. `npm run lint` (التأكد من التنسيق)
3. `npx tsx prisma/seed.ts` (التأكد من أن الـ Seeding يعمل بنجاح)
4. `npm run test` (تشغيل الـ Unit Tests)
5. إذا كان التغيير في الـ DB أو السياسات، أضف خطوة فحص الـ `seed-accounts`.
