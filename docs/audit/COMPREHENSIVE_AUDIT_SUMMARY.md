# التقرير النهائي للمسح الشامل

## 1. Architecture & Redundancy
### CRITICAL (3)
| # | المشكلة | الموقع | التفاصيل |
|---|---------|--------|----------|
| 1 | `fetchWithRetry` مكرر | `src/lib/fetchWithRetry.ts` vs `whatsapp-client.ts:14-37` | تنفيذين مختلفين لنفس الدالة |
| 2 | منطق البحث عن الحسابات مكرر ٣ مرات | `journal.ts:8`, `AccountingService.ts:57` | واحد يthrow والتاني auto-create |
| 3 | `withApiHandler` موجود ولكن ولا route واحد يستخدمه | `src/lib/api-handler.ts` | 73 route يعيدوا كتابة نفس البويلربليت |

### HIGH (3)
- دوال auth القديمة (`requireAuth`) لسه مستوردة في `api-handler.ts`
- 5 API routes تستخدم `console.error` بدل `logger.error`
- No error mapping موحد (كل route عنده error handling خاص)

## 2. Security
### HIGH (2)
- `POST /api/auth/refresh` **مفيش rate limiting** — ممكن brute-force
- `validateOrigin()` مش مطبق على كل routes (فقط 3 routes)

### MEDIUM (9)
- Export endpoints (Excel/PDF) مفيش rate limiting
- File upload (`/api/v1/upload`) مفيش rate limiting — ممكن flood
- `E2E_TEST` env var يلغي rate limiting لو تسرب للـ production
- `softDelete` ما بيضيفش `tenantId` في الـ where clause
- CORS preflight مش معالج
- الملفات المرفوعة بتتعمل validate على MIME type من الـ browser بس
- `JWT_REFRESH_SECRET` realx back ع `JWT_SECRET` لو مش set
- Sentry مفيهوش `beforeSend` لتصفية PII
- أخطاء CSRF validation متخطية في development

## 3. Accounting (Critical)
### CRITICAL (7)
| # | المشكلة | الموقع |
|---|---------|--------|
| 1 | Retained earnings code mismatch `3101` vs `3200` | `AccountingService.ts:318` |
| 2 | Balance sheet بفلتر بـ `createdAt` مش `journalEntry.date` | `AccountingService.ts:179` |
| 3 | Income statement بفلتر بـ `createdAt` مش `date` | `AccountingService.ts:249` |
| 4 | Trial balance بفلتر بـ `createdAt` مش `date` | `AccountingService.ts:118` |
| 5 | كل التقارير بتنسى `tenantId` — data leak بين الـ tenants | `AccountingService.ts:111,172,242` |
| 6 | أخطاء محاسبية مسكوت عنها في parts/complete-and-pay | `parts/route.ts:109`, `complete-and-pay/route.ts:194` |
| 7 | `requireOpenPeriod` أبداً ما بينندى — تقدر تنشر transactions في periods مقفولة | `accounting.ts:7` |

### HIGH (9)
- Code `1201` مستخدم لـ Equipment **و** Accumulated Depreciation في نفس الوقت
- Work order parts بيحط inventory على حساب Equipment (`1201`) بدل `1104`
- Work order cost adjustment بيحط على Rent Expense (`5201`) بدل حساب مخصص
- Stock adjustments وال inventory counts بيخلقوا journal entries بمبلغ `0` (لا تأثير محاسبي)
- Summary route بيخصم الـ discounts مرتين
- Period reopen مش بعكس closing entry
- Purchase دايماً credit لـ AP (مفيش خيار cash purchase)
- Transfer payment بيستخدم AR بدل Bank account

## 4. UI/UX & Responsiveness
### HIGH (4)
- `<html lang="en" dir="ltr">` hardcoded — RTL بيتحل client-side بس
- Hardcoded English strings في admin/settings و bookings
- مفيش `prefers-reduced-motion` (violation WCAG 2.3.3)
- Error pages (404, 500, ErrorBoundary) مش مترجمة

### MEDIUM (4)
- مفيش skeleton loaders في admin (spinner بس)
- مفيش admin-specific error/404/loading pages
- الـ 23 modal مفتقدين focus trapping
- RTL utilities محدودة (3 CSS classes بس)

### ولكن: الترجمات ممتازة (920+ key)، الـ sidebar responsive، empty states موجودة، skip link شغال

## 5. Documentation Gaps
### وثائق فيها معلومات غير حقيقية
| الوثيقة | المشكلة |
|---------|---------|
| `DEPLOYMENT_GUIDE.md` | بتتكلم عن Docker, Kubernetes, Prometheus, Grafana — مش موجودين |
| `GLOBAL_STRATEGY.md` | بتفترض microservices, AI/ML, React Native — مش موجودين |
| `WEEKLY_EXECUTION_PLAN.md` | Docker, Kubernetes, Swagger — مش موجودين |
| `UI_UX_COMPREHENSIVE_REVIEW.md` | بتدّعي WCAG 2.1 AA و "all problems fixed" — في 23 modal بدون focus trap |
| `VERSIONING_STRATEGY.md` | بتصنف POS, Work Orders على أنه "Planned" — هم مكتملين |

### Features مدعيّين في الوثائق مش موجودة
- Dark mode toggle (الـ app always-dark)
- Keyboard shortcuts
- Breadcrumbs
- Swagger/OpenAPI docs
- Component tests (صفر)
- `lib/prisma-e2e.ts`
- `npm run test:integration`, `test:performance`, `test:smoke`

## 6. التوصيات والـ Roadmap المقترح

### P0 (فوري — قبل أي push)
1. Fix `createdAt` → `journalEntry.date` في كل تقارير Accounting (balance sheet, income, trial balance)
2. أضف `tenantId` في queries التقارير (data leak)
3. Fix retained earnings code mismatch
4. Fix code 1201 collision (Equipment vs Accumulated Depreciation)
5. Fix wrong account codes في parts route (1201 → 1104)
6. Fix silent accounting failures — خلي الـ try/catch يعمل rollback

### P1 (أمان — بعد P0)
7. Rate limiting على `POST /api/auth/refresh` و upload endpoint
8. `validateOrigin()` على كل state-changing routes
9. `E2E_TEST` bypass - تأكد إنه مش leak للـ production
10. Period enforcement — استخدم `requireOpenPeriod` في كل routes

### P2 (UI/UX)
11. RTL server-side fix (`dir` و `lang` في middleware أو cookie)
12. Focus trapping لـ 23 modal
13. `prefers-reduced-motion` في globals.css
14. Skeleton loaders في admin
15. ترجمة error pages و hardcoded strings
16. Admin-specific 404 و error pages

### P3 (تنظيف)
17. وحد `fetchWithRetry` و account lookup logic
18. استخدم `withApiHandler` أو أزيله (لا تستخدم)
19. استبدل `console.*` بـ `logger.*` في كل مكان
20. املىء missing accounts في seed
21. Fix summary route double-counting

### P4 (توثيق)
22. صحح `README.md` (test count, routes, admin pages)
23. أزل أو صحح `DEPLOYMENT_GUIDE.md`, `GLOBAL_STRATEGY.md`, `WEEKLY_EXECUTION_PLAN.md`
24. صحح `UI_UX_COMPREHENSIVE_REVIEW.md` (الدرجات real)
25. أضف `src/schemas/` أو صحح `PROJECT_RULES.md`
