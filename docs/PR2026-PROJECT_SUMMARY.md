# 🏍️ EL PRINCE BAJAJ — Enterprise Motorcycle ERP  
## برومت شامل — وصف المشروع، التقنيات، التطوير، المشاكل، والخطة القادمة

---

## 1. نظرة عامة عن المشروع (Project Overview)

**EL PRINCE BAJAJ** هو نظام ERP (تخطيط موارد المؤسسة) متعدد المستأجرين (Multi-Tenant) مخصص لمراكز خدمة وصيانة موتوسيكلات **باجاج** في مصر.  
المشروع عبارة عن منصة ويب كاملة (Full-Stack) تشمل:

- **موقع عام (Public Website):** يعرض المنتجات والخدمات، ويمكن العملاء من حجز مواعيد الخدمة، ومراجعة المنتجات، والتواصل.
- **لوحة تحكم إدارية (Admin Portal):** 22 صفحة إدارة تغطي جميع العمليات اليومية لمركز الخدمة.
- **نظام نقاط بيع (POS):** مع دعم الباركود، وتقسيم طرق الدفع (كاش + بنك + تحويل).
- **نظام محاسبي (Accounting):** قيد مزدوج (Double-Entry)، دليل حسابات (Chart of Accounts)، فترات محاسبية.
- **نظام مخازن (Inventory/Warehouse):** متابعة المخزون، الجرد، استيراد Excel.
- **نظام ورش (Work Orders):** استقبال الخدمة، توزيع الميكانيكيين، إتمام الخدمة مع الفاتورة.
- **CRM:** ملفات العملاء، أسطول المركبات، سجل النشاط.
- **نظام مشتريات (Purchase Orders):** إدارة الموردين، أوامر الشراء، الاستلام.
- **واتساب (WhatsApp):** إرسال رسائل جماعية، قوالب، جدولة تذكيرات.
- **تقارير (Reports):** قائمة دخل، ميزانية عمومية، تدفق نقدي، مخزون، عملاء.
- **داشبورد (Dashboard):** 8 مؤشرات أداء رئيسية (KPIs).

### منصات التشغيل
  
- **الإنتاج (Production):** [`bajajelprince.vercel.app`](https://bajajelprince.vercel.app)
- **التطوير (Development):** `localhost:3000`
- **CI/CD:** GitHub Actions → Vercel

---

## 2. تاريخ الإنشاء والتطوير (Creation & Development History)

### البداية
تم إنشاء المشروع باستخدام `create-next-app` كنقطة بداية، مع التركيز على React 19 + Next.js 15 App Router.

### مراحل التطوير (حسب git log — 182 commit)

#### المرحلة 1: الأساس (Foundation)
- إعداد المشروع، Prisma schema (42 model)، قاعدة البيانات PostgreSQL (Neon)
- المصادقة (JWT + bcrypt)، التسلسل الهرمي للصلاحيات (RBAC)
- عزل المستأجرين (Multi-Tenant Isolation) باستخدام AsyncLocalStorage
- الموقع العام (Hero 3D، خدمات، تواصل)

#### المرحلة 2: العمليات الأساسية
- الفواتير (Invoices) مع دعم طرق الدفع المتعددة
- نظام نقاط البيع (POS)
- العملاء والمركبات (CRM)
- أوامر الشغل (Work Orders)
- الموردين وأوامر الشراء (Suppliers + Purchase Orders)

#### المرحلة 3: النظام المحاسبي
- القيد المزدوج (Double-Entry Journal)
- دليل الحسابات (Chart of Accounts)
- الفترات المحاسبية (Accounting Periods)
- التقارير المالية (Balance Sheet, Income Statement, Trial Balance)

#### المرحلة 4: المخازن والجرد
- متابعة المخزون، حركات المخزون
- الجرد الدوري (Inventory Counts)
- استيراد Excel/PDF
- تنبيهات نفاد المخزون

#### المرحلة 5: واتساب والأتمتة
- تكامل WhatsApp Web (Baileys)
- قوالب الرسائل، جدولة التذكيرات
- Cron Jobs على Vercel

#### المرحلة 6: الاختبارات والتحسينات
- 9 ملفات E2E (Playwright) — ~131 اختبار
- 17 اختبار وحدة (Vitest)
- تحسينات الأمان (Rate Limiting, CSP, Sanitization)
- تدقيق أمني (Enterprise Audit)

#### المرحلة 7: CI/CD والنشر
- GitHub Actions (تأكد من TypeScript، Lint، Build، Unit Tests، E2E)
- نشر تلقائي على Vercel
- CodeQL Scanning, Dependabot

---

## 3. الوضع الحالي للمشروع (Current State)

### ✅ مكتمل (Working)
- **42 model** في قاعدة البيانات
- **31 API endpoint** (auth + v1)
- **22 صفحة إدارة** مع responsive design
- نظام محاسبي بقيد مزدوج يعمل
- تكامل واتساب مع QR code
- نظام صلاحيات كامل (admin/staff/viewer)
- 9 اختبارات E2E (~131 test) — خضراء على main
- CI/CD pipeline كامل — TypeScript, Lint, Build, Test, E2E, Deploy
- **0 `any` types** في production code
- **0 `ts-ignore`** في الـ codebase
- كود نظيف (TypeScript strict mode, 0 أخطاء in `tsc --noEmit`)

### ⚠️ مشاكل معروفة مع الحلول (معظمها متكشفة من التدقيق)

انظر `docs/audit/COMPREHENSIVE_AUDIT_SUMMARY.md` للتفاصيل الكاملة.

#### الأهم (Critical — P0)
1. **التقارير المالية بتاعثة** — بتفلتر بـ `createdAt` مش `journalEntry.date`
2. **تسريب بيانات Multi-Tenant** — تقارير Accounting بتنسى تضيف `tenantId`
3. **Retained Earnings code 3101 vs 3200** — تقفيل الـ period هيفشل أو يخلق duplicate
4. **Code 1201 collision** — Equipment و Accumulated Depreciation نفس الكود
5. **أخطاء محاسبية مسكوت عنها** — work order parts/complete-and-pay الـ try/catch بيسكت على أخطاء المحاسبة
6. **`requireOpenPeriod` مش مستخدم** — أي transaction ممكن تنعمل على periods مقفولة

#### الأمان (P1)
7. **`/api/auth/refresh` مفيش rate limiting** — ثغرة
8. **`validateOrigin()` على 3 routes بس** — باقي الـ 70 route مفيش CSRF
9. **File upload مفيش rate limiting ولا MIME validation حقيقي**
10. **`E2E_TEST` env var يلغي rate limiting كامل**

#### UI/UX (P2)
11. **RTL مش server-side** — `<html lang="en" dir="ltr">` hardcoded
12. **23 modal بدون focus trapping** — مشكلة وصول (Accessibility)
13. **Error pages مش مترجمة**
14. **مفيش `prefers-reduced-motion`**
15. **مفيش skeleton loaders** — spinner بس

#### البنية التحتية (P3)
16. **`fetchWithRetry` مكرر** — ملفين نفس الدالة
17. **Account lookup logic مكرر 3 مرات** — سلوك مختلف في كل مرة
18. **`withApiHandler` غير مستخدم** — 73 route بيكتبوا نفس البويلربليت
19. **23 `console.*` في production code** — بدل `logger`

### 📝 ناقص (Missing Features)
- **Dark Mode toggle** — الـ app always-dark، مفيش light mode ولا toggle
- **Keyboard shortcuts** — صفر
- **Breadcrumbs** — صفر
- **Swagger/OpenAPI docs** — صفر
- **Component Tests** — صفر (فقط اختبارات وحدة + E2E)
- **Admin-specific 404/error/loading pages** — مش موجودين

### 📄 مشاكل التوثيق (Documentation Issues)
بعض ملفات `docs/` فيها معلومات غير حقيقية:
- **DEPLOYMENT_GUIDE.md**: يتكلم عن Docker, Kubernetes, Prometheus, Grafana — مش موجودين
- **GLOBAL_STRATEGY.md**: Microservices, AI/ML, React Native — مش موجودين
- **UI_UX_COMPREHENSIVE_REVIEW.md**: يدّعي WCAG 2.1 AA و "all problems fixed" — غير صحيح
- **VERSIONING_STRATEGY.md**: يصنف POS/Inventory/Work Orders كـ "Planned" — هم مكتملين

---

## 4. منهجية كتابة الكود (Coding Methodology & Conventions)

### المبادئ الأساسية
- **Server Components** أولاً، Client Components فقط عند الحاجة (useState, useEffect, browser APIs, Three.js, Framer Motion)
- **TypeScript Strict Mode** — ممنوع `any`، ممنوع `ts-ignore`
- **مسارات مطلقة** باستخدام `@/` (مثل `import { x } from '@/lib/auth'`)
- **Prisma + Zod** — validation على كل request body
- **Multi-Tenant** — كل query ليها tenantId auto-injected عبر Prisma extension
- **Soft Delete** — `isDeleted: false` default filter على كل queries
- **Audit Log** — كل mutation مسجلة في `AuditLog`
- **Error Handling** — `try/catch` مع `NextResponse.json({ success: false, error: ... })`

### هيكل المشروع
```
src/
├── app/
│   ├── (site)/           # Public pages (server components)
│   ├── admin/             # Admin pages (client components)
│   │   ├── dashboard/     #   Each page has loading/error/empty states
│   │   └── ...
│   └── api/               # API routes (route.ts)
│       ├── auth/          #   Login, logout, refresh, me
│       └── v1/            #   Versioned API (31 directories)
├── components/            # Shared components
├── lib/                   # Core library (auth, prisma, logger, ...)
├── services/              # Business logic services (AccountingService, ...)
└── types/                 # Shared types
prisma/
├── schema.prisma          # 42 models
├── seed.ts                # Admin user + vehicle models
└── seed-accounts.ts       # 28 default accounts
e2e/                       # Playwright E2E tests (9 files)
```

### نمط الـ API Routes
كل route تتبع نمط موحد:
```ts
// 1. Auth check
const session = await withRole(['admin', 'staff']);
// 2. Rate limiting
const rateLimit = await checkRateLimit();
// 3. Body validation (POST/PATCH)
const data = schema.parse(body);
// 4. Business logic
const result = await prisma.model.create({ data });
// 5. Response
return NextResponse.json({ success: true, data: result });
```

### نمط الـ Admin Pages
كل صفحة admin تتبع:
```tsx
'use client';
// 1. State: loading, data, error
// 2. Fetch على mount (useEffect)
// 3. Loading spinner
// 4. Error handling
// 5. Empty state
// 6. Data table/cards
// 7. Modals للإضافة/التعديل (role="dialog" + aria-modal="true")
```

---

## 5. اللغات والتقنيات والإصدارات (Languages & Technologies)

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| **Node.js** | 24.14.1 | Runtime |
| **npm** | 11.11.0 | Package manager |
| **Next.js** | 15.5.19 | Framework (App Router) |
| **React** | 19.1.0 | UI Library |
| **TypeScript** | ^5 (5.9.3) | Type safety |
| **Tailwind CSS** | ^4 (4.3.2) | Utility-first CSS |
| **Prisma** | 6.19.3 | ORM + Database client |
| **PostgreSQL** | (Neon) | Database |
| **Zod** | 3.24.2 | Schema validation |
| **jose** | 6.0.10 | JWT tokens |
| **bcryptjs** | 3.0.3 | Password hashing |
| **Playwright** | 1.60.0 | E2E testing |
| **Vitest** | 4.1.9 | Unit testing |
| **Framer Motion** | 12.10.0 | Animations |
| **GSAP** | 3.15.0 | Scroll animations |
| **Three.js** | 0.184.0 | 3D (Hero motorcycle) |
| **React Three Fiber** | 9.6.1 | R3F integration |
| **lucide-react** | 0.487.0 | Icons |
| **zustand** | 5.0.14 | State management |
| **@upstash/ratelimit** | 2.0.8 | Rate limiting |
| **Baileys** | 7.0.0-rc13 | WhatsApp Web API |
| **Sentry** | (lazy) | Error tracking |
| **ESLint** | ^9 | Linting |
| **Vercel** | — | Hosting/Deployment |

---

## 6. خطة التطوير القادمة (Development Roadmap)

### P0 — فوري (قبل أي push)
| المهمة | الموقع | الجهد |
|--------|--------|-------|
| Fix `createdAt` → `journalEntry.date` في كل التقارير | `AccountingService.ts` | يوم |
| Fix `tenantId` المفقود في queries التقارير | `AccountingService.ts` | نصف يوم |
| Fix retained earnings code mismatch (3101 vs 3200) | `AccountingService.ts:318` + `seed-accounts.ts` | ساعة |
| Fix code 1201 collision | `seed-accounts.ts` + `constants/accounting.ts` | ساعة |
| Fix wrong account codes في parts route (1201 → 1104) | `parts/route.ts:74` | نصف ساعة |
| أزل silent try/catch من accounting errors | `parts/route.ts:109`, `complete-and-pay/route.ts:194` | ساعة |
| استخدم `requireOpenPeriod` في كل journal-creating routes | الـ routes كلها | يوم |
| استبدل `console.error` بـ `logger.error` في API routes | 5 ملفات | ساعة |

### P1 — أمان
| المهمة | الجهد |
|--------|-------|
| Rate limiting على `/api/auth/refresh` | ساعة |
| Rate limiting على `/api/v1/upload` | ساعة |
| `validateOrigin()` على كل state-changing routes | يوم |
| تأمين `E2E_TEST` bypass | نصف ساعة |
| File upload MIME validation حقيقي (magic bytes) | ساعتين |
| Sentry `beforeSend` hook لتصفية PII | ساعة |
| تأكد إن `JWT_REFRESH_SECRET` مختلف عن `JWT_SECRET` | نصف ساعة |

### P2 — UI/UX
| المهمة | الجهد |
|--------|-------|
| Fix RTL server-side (`lang` + `dir` via middleware/cookie) | 3 ساعات |
| Focus trapping لـ 23 modal | يوم |
| `prefers-reduced-motion` في globals.css | ساعة |
| Skeleton loaders للمكونات المتكررة | 3 ساعات |
| ترجمة error pages و hardcoded strings | يوم |
| Admin-specific 404, error, loading pages | 3 ساعات |

### P3 — تنظيف وتحسين
| المهمة | الجهد |
|--------|-------|
| وحد `fetchWithRetry` (ملفين → ملف واحد) | ساعة |
| وحد account lookup logic (3 نسخ → 1) | 3 ساعات |
| استخدم `withApiHandler` أو أزيله بالكامل | يوم |
| Fix summary route (discounts + expenses double-count) | ساعتين |
| أملىء missing accounts في seed (1105, 1106, 2104, 2200, 3102, 5400, 1205) | ساعة |
| أضف unique constraint على `(referenceType, referenceId)` لقيد التكرار | ساعة |
| Fix zero-amount journal entries في stock adjustments | 3 ساعات |
| Fix transfer payment → Bank مش AR | ساعة |

### P4 — توثيق
| المهمة | الجهد |
|--------|-------|
| صحح `README.md` (test count: 31+ → ~131, routes) | ساعة |
| أزل أو صحح `DEPLOYMENT_GUIDE.md`, `GLOBAL_STRATEGY.md`, `WEEKLY_EXECUTION_PLAN.md` | ساعتين |
| صحح `UI_UX_COMPREHENSIVE_REVIEW.md` (الدرجات الحقيقية) | ساعة |
| صحح `VERSIONING_STRATEGY.md` | نصف ساعة |
| أضف `src/schemas/` أو صحح `PROJECT_RULES.md` | ساعة |

---

## 7. العقبات والتحديات (Blockers & Challenges)

### 1. **تضارب الـ accounting logic**
   - المشكلة الأكبر. التقارير المالية كلها بتستخدم `createdAt` بدل التاريخ الفعلي للحركة
   - الحل يتطلب تغيير في `AccountingService` كله + ترحيل البيانات
   - **التأثير:** أي أرقام بتطلع من النظام حالياً غير دقيقة

### 2. **عدم الاتساق في الأنماط**
   - الـ `withApiHandler` موجود ولكن كل route بتعمل error handling بنفسها
   - لو جينا نستخدم `withApiHandler`، 73 route هتتغير
   - **التأثير:** صيانة عالية، تغيير في error handling محتاج 73 ملف

### 3. **Multi-Tenant Data Leak**
   - 3 تقارير رئيسية بتنسى tenantId filter
   - **التأثير:** شركة تشوف بيانات شركة تانية — كارثة

### 4. **التوثيق غير متطابق مع الواقع**
   - مستندات بتتكلم عن حاجات مش موجودة (Docker, Kubernetes, AI/ML)
   - **التأثير:** مضلل للمستثمرين أو أعضاء الفريق الجدد

### 5. **صفر اختبارات UI (Component Tests)**
   - 38 unit test + 131 E2E، ولكن صفر اختبار UI
   - **التأثير:** تغيير UI محتاج اختبار يدوي

### 6. **Performance على Vercel Serverless**
   - كل Route عبارة عن Serverless Function
   - التقارير المعقدة (Balance Sheet, Reports) بتعمل queries كبيرة
   - **التأثير:** Cold starts بطيئة، استهلاك عالي

### 7. **System of Record (النظام المحاسبي)**
   - في حتة cashier، الـ transaction بتتسجل في مكانين: `Transaction` model و `JournalEntry`
   - **التأثير:** reconciliation صعبة، ممكن أرقام تختلف

---

## 8. الموارد المرجعية (Sources)

- **الكود المصدري:** المسار الحالي `/media/mahmoudashraf/Linux/CourseraMeta/PortFolio/new bajaj/CascadeProjects/windsurf-project/`
- **GitHub:** `https://github.com/MahmoudAshraf55/bajaj-al-prince`
- **Live Demo:** `https://bajajelprince.vercel.app`
- **الوثائق (docs/):** 
  - `docs/ENTERPRISE_AUDIT_REPORT.md` — التدقيق الأمني الأشمل
  - `docs/audit/COMPREHENSIVE_AUDIT_SUMMARY.md` — ملخص التدقيق الحالي
  - `docs/SYSTEM_RULES.md` — قواعد الأمان
  - `docs/PROJECT_RULES.md` — قواعد الكود
  - `docs/AGENTS.md` — قواعد الـ Agent
- **مصادر خارجية:**
  - Next.js 15 Docs: https://nextjs.org/docs
  - Prisma 6 Docs: https://www.prisma.io/docs
  - Tailwind CSS 4 Docs: https://tailwindcss.com/docs
  - Playwright Docs: https://playwright.dev/docs
  - Vercel Docs: https://vercel.com/docs
  - Neon (PostgreSQL): https://neon.tech/docs

---

> ⏰ **آخر تحديث:** 12 يوليو 2026  
> 📝 **الإصدار:** 0.1.0  
> 👤 **المطور:** Mahmoud Ashraf
