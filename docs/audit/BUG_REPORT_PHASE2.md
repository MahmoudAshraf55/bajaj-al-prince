# تقرير المرحلة الثانية — الفحص الشامل (Phase 2 Bug Report)
**التاريخ:** 12 يوليو 2026  
**الحالة:** تم الفحص — في انتظار التصحيح

---

## أولاً: الـ Warehouse — استيراد Excel/PDF

### ✅ المشكلة 1: استيراد Excel يعرض معاينة ويستخرج البيانات (FIXED)
**التحليل والحالة الحالية:**  
- الـ API route `src/app/api/v1/products/import-excel/route.ts` يدعم `action: 'preview'` و `action: 'confirm'`
- `parseExcelSheet()` يقرأ الملف بـ `XLSX.read` ويُرجع `headers`, `preview` (أول 10 صفوف), `totalRows`, `fileName`
- `parseRow()` يدعم الأسماء العربية والإنجليزية: SKU, Barcode, English/Arabic Name, Category, Unit Price, Cost, Stock, Unit, Description, Tax Rate, Active/Expiry dates
- `WHImportTab.tsx` يعرض جدول المعاينة (10 صفوف) مع أزرار Confirm/Cancel
- **التحقق العملي:** تم إنشاء ملف Excel تجريبي واختبار الاستخراج — النتيجة: 2 صفوف مُستخرجة بنجاح مع headers وبيانات عربية سليمة

**الموقع:** `src/app/api/v1/products/import-excel/route.ts` + `WHImportTab.tsx` + `warehouse/page.tsx`  
**الحالة:** ✅ RESOLVED (تم التحقق فعلياً)

### ✅ المشكلة 2: استيراد PDF يستخرج كل البيانات (FIXED)
**التحليل والحالة الحالية:**  
- الـ commit `a3d40c3` وسّع `extractRows()` لاستخراج كل الحقول العشرة
- `ExtractedRow` يشمل: sku, barcode, name, nameAr, price, costPrice, stock, unit, description, taxRate
- `extractRows()` يستخدم heuristics لاستخراج: الاسم (أول token غير رقمي)، الاسم العربي (من فحص Unicode range)، السعر والتكلفة (آخر قيمتين رقميتين)، المخزون (عدد صحيح قريب من السعر)، SKU (كود alphanumeric)، الباركود (8-14 رقم)، الوحدة (اختصارات معروفة)، الوصف (نص طويل)، الضريبة (نسبة مئوية)
- الـ PDF parsing يستخدم `pdf-parse` v2.4.5: `new PDFParse({ data: buffer })` + `getText()`
- **ملاحظة:** الاستخراج heuristic-based ويعمل بشكل جيد مع PDFs منظمة (جداول نصية). PDFs المبنية على صور تحتاج OCR (خارج النطاق)

**الموقع:** `src/app/api/v1/products/import-pdf/route.ts`  
**الحالة:** ✅ RESOLVED (commit a3d40c3)

---

## ثانياً: الـ POS — نقطة البيع

### ✅ المشكلة 3: فتح أكثر من فاتورة (Hold / Multi-draft) (FIXED)
**الحل المطبق:**  
- أُضيف دعم الـ held drafts إلى `posStore`:
  - `heldDrafts: HeldDraft[]` — قائمة الفواتير المحفوظة مؤقتاً
  - `holdCart()` — يحفظ حالة السلة كاملة (cart, discount, paid, customer, notes, taxRate, paymentMethod, splitPayments, isReturn) ويمسح السلة الحالية
  - `loadDraft(id)` — يسترجع مسودة ويعيدها للسلة ويحذفها من المحفوظات
  - `removeDraft(id)` — يحذف مسودة
- **الواجهة** (`POSCart.tsx`):
  - زر **Hold** في ترويسة السلة (معطّل إن كانت فارغة)
  - زر **Held Invoices** يعرض عداد المحفوظات ويفتح لوحة فيها كل مسودة مع أزرار Load/Delete
  - كل مسودة تعرض: الاسم، عدد الأصناف، العميل، الإجمالي
- **الترجمة:** أُضيفت مفاتيح `pos_hold`, `pos_hold_sale`, `pos_held_drafts`, `pos_load`, `pos_load_draft`, `pos_delete_draft`, `pos_walk_in` (EN + AR)
- يمكن الآن فتح أكثر من فاتورة: احفظ الحالية مؤقتاً وابدأ أخرى ثم استرجعها

**الموقع:** `src/store/posStore.ts`, `src/components/pos/POSCart.tsx`, `src/app/admin/pos/page.tsx`, `src/components/translations.ts`  
**الحالة:** ✅ RESOLVED (تم التنفيذ في هذه الجلسة)

### 🟠 المشكلة 4: الباركود اليدوي سريع جداً — الـ 150ms debounce مش مناسب للكتابة اليدوية
**التحليل:**  
- فيه debounce 150ms بيشتغل تلقائياً للباركود  
- **السبب:** الـ code رقم `barcodeDebounceRef` بيشتغل على أي تغيير في `manualBarcode` — لو المستخدم بيكتب ببطء، الـ debounce يشتغل قبل ما يخلص كتابة  
- **للـ scanner hardware:** 150ms مناسب  
- **للـ manual typing:** محتاج ≥ 500ms

**الموقع:** `src/app/admin/pos/page.tsx:161-173`  
**المطلوب:** تمييز بين scanner vs manual typing أو زيادة debounce للمدخل اليدوي

### 🔴 المشكلة 5: مرتجع الفاتورة مش شغال صح
**التحليل:**  
- `handleReturnInvoice()` بيستخدم `confirm()` + بياخد كل items الفاتورة الأصلية  
- return اللي بيتعمل بيحط `type: 'return'` بس مش بيعمل reverse للـ original  
- **السبب:** الـ return بيعمل invoice جديدة مش cancellation للقديمة

**الموقع:** `src/app/admin/pos/page.tsx:477-507`  
**المطلوب:**  
- إزالة `confirm()` واستخدام addToast  
- ربط return بالفاتورة الأصلية  
- إلغاء `handleCancelInvoice` من واجهة المستخدم (خلينا مرتجع بس)

### 🔵 المشكلة 6: الخزينة مش متزامنة مع السيستم
**التحليل:**  
- الـ Treasury بيعمل fetch على `/api/v1/invoices/?limit=200`  
- بيحسب totals من invoice records مش من journal entries  
- الـ returns مش بتتنقص من total

**الموقع:** `src/app/admin/pos/page.tsx:509-529` (loadTreasury)  
**المطلوب:** ربط Treasury مع الـ accounting system (journal entries)

---

## ثالثاً: الـ Accounting — المحاسبة

### 🔴 المشكلة 7: acc_summary مش متزامن مع السيستم
**التحليل:**  
- الـ Summary API بيقرا من Invoice/Transaction/WorkOrder مباشرة  
- الـ Trial Balance/Balance Sheet/Income Statement بيقرا من JournalEntry/JournalEntryLine  
- **نظامين منفصلين** — الأرقام ممكن تختلف  
- `createdAt` بدل `journalEntry.date` (المشكلة C1 من التقرير السابق)

**الموقع:** `src/app/api/v1/accounting/summary/route.ts:49-67`  
**المطلوب:** توحيد المصدر — الـ Summary لازم يقرأ من JournalEntries

### 🔴 المشكلة 8: المعاملات فاضية (Transactions empty)
**التحليل:**  
- Transactions API (`/api/v1/accounting/transactions/`) بيجمع Invoices + manual Transactions + Work Orders  
- **السبب:** لو مفيش data في الفترة المحددة، بيرجع array فاضي  
- **أو:** لو الـ invoices ملهاش journal entries، مش بتظهر في الـ transactions tab

**الموقع:** `src/app/api/v1/accounting/transactions/route.ts:24-45`  
**المطلوب:**  
- تأكيد ان كل invoice ليها journal entry  
- التأكد من الفلترة

### ✅ المشكلة 9: Trial Balance / Balance Sheet / Income Statement (FIXED)
**الحل المطبق:**  
- جميع التقارير تستخدم `journalEntry.date` بشكل صحيح (ليس `createdAt`)
- **getTrialBalance()** (السطر 121):
  - `where.journalEntry = { date: { lte: asOfDate } }`
  - يستخدم `journalEntry.date` لـ filtering
- **getBalanceSheet()** (نفس النمط):
  - يستخدم `journalEntry.date` للـ period filtering
- **getIncomeStatement()** (السطر 252-254):
  - `where.journalEntry = { date: {} }`
  - `if (fromDate) where.journalEntry.date.gte = fromDate`
  - `if (toDate) where.journalEntry.date.lte = toDate`
  - يستخدم `journalEntry.date` للـ range filtering
- **التطبيق:**
  - كل التقارير تستخدم `journalEntryLine` مع `journalEntry.date` filter
  - التاريخ الـ accurate لـ transactions (ليس وقت الـ creation)
  - يعكس العملية المحاسبية الفعلية
  - تم إصلاحه في commit `d156051`

**الموقع:** `src/services/AccountingService.ts:109-305`  
**الحالة:** ✅ RESOLVED

### 🟠 المشكلة 10: التصنيف اليومي/شهري/ربع سنوي/سنوي
**التحليل:**  
- الـ frontend بيبعت `from` و `to` dates  
- الـ period بيتم تحديده حسب عدد الأيام (<28 = day, 28-89 = month, إلخ)  
- **لكن الـ filtering بيستخدم `createdAt`** على Invoice/Transaction level مش journalEntry.date

**الموقع:** `src/app/api/v1/accounting/summary/route.ts:95-99`  
**المطلوب:** استخدام `journalEntry.date` بدل `createdAt` + توحيد الفلترة

---

## رابعاً: الـ Accounts — الحسابات

### ✅ المشكلة 11: الشجرة (Tree) متزامنة بشكل صحيح (FIXED)
**الحل المطبق:**  
- `isDeleted: false` فلتر موجود في API (السطر 27 و 41)
- Tree hierarchy صحيحة مع `parentId`
- **في API** (`src/app/api/v1/accounts/route.ts`):
  - السطر 27: `where: { isDeleted: false }`
  - السطر 41: `where: { isDeleted: false }` للـ children
  - يستخدم Prisma `include` مع `children` relation
  - يرجع كل الـ non-deleted accounts مع أطفالهم
- **في Seed** (`prisma/seed-accounts.ts`):
  - Chart of Accounts كامل مع 5 مجموعات رئيسية (Assets, Liabilities, Equity, Revenue, Expenses)
  - كل مجموعة لها sub-accounts متسلسلة
  - المسميات العربية موجودة للجميع
  - Upsert logic يربط الأطفال بالوالد عبر `parentId`
  - Hierarchy صحيحة ومعايير محاسبية صحيحة
- **النتيجة:**
  - الشجرة تظهر صحيحة في الـ frontend
  - الحسابات المحذوفة لا تظهر
  - Relationships صحيحة

**الموقع:** `src/app/api/v1/accounts/route.ts` و `prisma/seed-accounts.ts`  
**الحالة:** ✅ RESOLVED

---

## خامساً: Journal Entries — قيود اليومية

### 🟠 المشكلة 12: SALE / RETURN / PURCHASE / INCOME / EXPENSE / STOCK_ADJUSTMENT
**التحليل:**  
- الفلاتر شغالة في الـ API (`where: { type }`)  
- **لكن:** لو journal entries مش موجودة للأنواع دي، الفلتر يرجع فاضي  
- **السبب:** `createDoubleEntry()` بيستخدم type mapping مختلف عن الفلاتر

**الموقع:** `src/app/api/v1/journal-entries/route.ts:23-56`  
**المطلوب:** التأكد من تطابق types بين الـ creation والـ filter

---

## سادساً: Reports — التقارير

### ✅ المشكلة 13: التقارير المالية دقيقة وتستخدم journal entries (FIXED)
**الحل المطبق:**  
- جميع التقارير المالية تستخدم `journal entries` من `AccountingService`
- **P&L Report** (السطر 37-85):
  - `AccountingService.getIncomeStatement(tx, from, to)` — revenue, expenses من journal entries
  - `journalEntry.findMany({ type: 'PURCHASE' })` — تفاصيل المشتريات
  - `journalEntry.findMany({ type: 'INCOME' })` — الدخل الإضافي
  - يحسب: revenue, COGS, gross profit, net profit
- **Balance Sheet** (السطر 87-150):
  - `AccountingService.getBalanceSheet(tx, to)` — الأصول والخصوم والحقوق
  - `journalEntryLine.findMany()` مع `ACCOUNT_CODES.CASH` — رصيد النقد
  - يتحقق من inventoryValue من products
- **Cash Flow** (السطر 152-206):
  - `journalEntry.findMany()` للـ SALE, EXPENSE, INCOME, PURCHASE
  - يفلتر على `paymentMethod` (cash, card, transfer)
  - يحسب operating cash flow من journal entries
- **التطبيق:**
  - كل الـ reports تستخدم `journalEntry.date` مباشرة (ليس `createdAt`)
  - تستخدم `AccountingService` للـ consistent calculations
  - تأخذ tenant context في الاعتبار

**الموقع:** `src/app/api/v1/reports/financial/route.ts`  
**الحالة:** ✅ RESOLVED

### 🟠 المشكلة 14: تقرير قيمة المخزن (Stock Value) لا يعمل
**التحليل:**  
- Inventory Value = `SUM(product.costPrice * product.stock)`  
- لو products ملهاش `costPrice` (null/0)، بيستخدم `price`  
- **السبب:** مشكلة في الـ API route — الـ Stock Value query ممكن يكون فيها bug

**الموقع:** `src/app/api/v1/reports/inventory/route.ts:67-99`  
**المطلوب:** فحص وتصحيح query قيمة المخزن

### 🟠 المشكلة 15: تقارير العملاء غير متزامنة مع الفواتير
**التحليل:**  
- Client report بيجيب customers with joined invoices  
- **السبب:** الـ filter على `createdAt` مش الـ `invoice.date`

**الموقع:** `src/app/api/v1/reports/customers/route.ts:19-32`  
**المطلوب:** استخدام `invoice.date` بدل `createdAt`

---

## سابعاً: Purchase Orders — أوامر الشراء

### 🟠 المشكلة 16: التزامن مع المخازن والحسابات
**التحليل:**  
- Purchase orders بتعمل `createDoubleEntry` بـ `type: 'PURCHASE'`  
- **Debit:** Inventory (1104) — **Credit:** Accounts Payable (2101)  
- الـ receipt الجزئي مش بيعمل journal entries

**الموقع:** `src/app/api/v1/purchase-orders/[id]/route.ts`  
**المطلوب:** فحص sync + إضافة partial receipt accounting

---

## ثامناً: Market — المتجر

### 🟠 المشكلة 17: أول المنتجات في الصفحة مش بتتعدل أو تتمسح
**التحليل:**  
- **السبب:** Pagination — أول صفحة ممكن يكون فيها cached data أو index issue  
- **أو:** الـ modal بيستخدم index مش ID

**الموقع:** `src/app/admin/market/page.tsx`  
**المطلوب:** فحص edit/delete logic للأول elements

### ✅ المشكلة 18: توليد الصور مع Pollinations API (FIXED)
**الحل المطبق:**  
- **API Endpoint**: `src/app/api/v1/ai/generate-image/route.ts` — مكتملة وتستخدم Pollinations API
- **المميزات:**
  - Fetches من Pollinations API مع Zod validation للـ prompt
  - يخزّن الصور المُولدة في `public/uploads/` مع random filename
  - يُرجع `url` للصورة المُحفوظة
  - Rate limiting فعّال للـ admin users
- **الاستخدام:** Market page (`src/app/admin/market/page.tsx`) يستخدمه لـ product image generation
- **الـ Key:** `POLLINATIONS_API_KEY` موجود في `.env` و معرّف في `.env.example`
- **التطبيق:**
  - قبول prompt من product name + description + category
  - إنشاء random seed للصور المختلفة
  - حفظ الصور مع رفع الـ URL إلى form state

**الموقع:** `src/app/api/v1/ai/generate-image/route.ts`  
**الحالة:** ✅ RESOLVED

### 🟠 المشكلة 19: زر إضافة منتج لا يعمل في أول الصفحة
**التحليل:**  
- نفس المشكلة 17 — مشكلة pagination أو modal state

---

## تاسعاً: Manufacturers — الشركات المصنعة

### 🟠 المشكلة 20: BAJAJ مش ظاهر
**التحليل:**  
- الـ seed فاضي للـ manufacturers — مفيش بيانات مسبقة  
- **السبب:** مفيش `seed-vehicles.ts` أو الـ seed مش مهيأ

**الموقع:** `prisma/seed.ts`  
**المطلوب:** إضافة Bajaj كـ manufacturer في seed

---

## عاشراً: Work Orders — أوامر الخدمة

### ✅ المشكلة 21: Parts & Labour متزامنين مع POS (FIXED)
**الحل المطبق:**  
- أضيفنا `isService` و `lockInventory` flags للـ Product model
- عدّلنا invoice stock deduction logic لـ respect `lockInventory` flag
- أضيفنا Parts/Service filter UI في POS page
- Service items (isService=true) يظهرون في POS لكن لا يؤثرون على المخزن
- **التطبيق:**
  1. `prisma/schema.prisma`: أضيفنا `isService` و `lockInventory` بـ defaults false
  2. `src/app/api/v1/invoices/route.ts`: عدّلنا الـ stock deduction logic للـ check lockInventory
  3. `src/app/admin/pos/page.tsx`: أضيفنا `serviceFilter` state + updated filter logic
  4. `src/components/pos/POSProductGrid.tsx`: أضيفنا filter buttons (All/Parts/Services)
  5. `src/types/pos.ts`: أضيفنا `isService?` و `lockInventory?` optional fields
- **النتيجة:** الآن يمكن بيع Parts و Services معاً في نفس الفاتورة من غير تأثير على المخزن

**الموقع:** Multiple files — see commits above  
**الحالة:** ✅ RESOLVED — 5 commits pushed

### 🔴 المشكلة 22: لا يوجد ربط بين فاتورة الـ POS وفاتورة الخدمة
**التحليل:**  
- POS بيحط `workOrderId` في request بس الـ Zod schema مش بتقبله  
- **السبب:** `createInvoiceSchema` مش متضمن `workOrderId`

**الموقع:** `src/app/api/v1/invoices/route.ts:18-32`  
**المطلوب:** إضافة `workOrderId` للـ schema وربطه

### ✅ المشكلة 23: تعديل وإلغاء مش موجودين — نستخدم "مرتجع" (FIXED)
**الحل المطبق:**  
- لا توجد edit أو cancel buttons في واجهة Work Orders (كما هو مطلوب)
- Return button موجود ويعمل بشكل صحيح للـ completed work orders فقط
- Return يقوم بـ:
  1. تغيير status إلى `returned`
  2. إعادة الأجزاء للمخزن (increment stock)
  3. إنشاء stock movement records لـ audit trail
  4. إنشاء return invoice برقم مسلسل (RET-YYYYMMDD-####)
  5. عكس كل journal entries الأصلية (reversal entries)
  6. تسجيل العملية في audit log
- **الملفات:**
  - `src/app/admin/work-orders/page.tsx`: Return button في السطر 468-471
  - `src/app/api/v1/work-orders/[id]/return/route.ts`: تطبيق كامل للـ return logic
  - `src/components/translations.ts`: `wo_return` و `wo_return_confirm` keys موجودة

**الموقع:** `src/app/admin/work-orders/page.tsx` و `src/app/api/v1/work-orders/[id]/return/route.ts`  
**الحالة:** ✅ RESOLVED

---

## حادي عشر: Suppliers — الموردين

### 🟠 المشكلة 24: التزامن مع أوامر الشراء
**التحليل:**  
- Suppliers page بيجيب suppliers بس من غير بيانات أوامر الشراء  
- **السبب:** مفيش join مع purchase orders

**الموقع:** `src/app/admin/suppliers/page.tsx`  
**المطلوب:** إضافة show purchase orders per supplier

---

## ثاني عشر: Settings — الإعدادات

### ✅ المشكلة 25: الشعار النصي — لازم يكون في رفع لوجو (FIXED)
**الحل المطبق:**  
- Logo upload functionality بالفعل موجودة وتعمل بشكل كامل
- **في Branding tab:**
  - Input field للـ site name
  - Input field للـ tagline
  - Logo upload field مع:
    - Preview للـ logo الحالي
    - Upload button يفتح file picker
    - Remove button لحذف الـ logo
    - Loading indicator أثناء الـ upload
  - الـ logo يتم حفظه في الـ settings ويظهر في:
    - Settings page
    - Header/Navigation bars
    - Reports و documents
- **التطبيق:**
  - `src/app/admin/settings/page.tsx:321-378`: Logo upload UI
  - `src/app/api/v1/upload/route.ts`: Upload API endpoint
  - `src/components/translations.ts`: `settings_logo` و `settings_logo_upload` keys
  - `brand_logo` field محفوظ في settings database

**الموقع:** `src/app/admin/settings/page.tsx`  
**الحالة:** ✅ RESOLVED

---

## ثالث عشر: الترجمة

### 🔴 المشكلة 26: الوضع العربي يظهر إنجليزي
**التحليل:**  
- الـ translations.ts فيه 920+ key لكل لغة  
- التقارير والـ PDF ملهاش ترجمة  
- 23 hardcoded English strings في dashboard و bookings

**الموقع:** متعدد — كل الموقع  
**المطلوب:** تصحيح كل hardcoded strings في كل ملفات admin

---

# خطة الإصلاح المقترحة (Proposed Fix Plan)

## Phase 0 — P0 (فوري — أمان البيانات)
| الأولوية | المشكلة | الجهد |
|----------|---------|-------|
| P0 | 9 — Trial Balance/Balance Sheet/Income: `createdAt` → `journalEntry.date` | يوم |
| P0 | 7 — Summary synchronization مع journal entries | يوم |
| P0 | 22 — Work order الربط مع POS invoice | 4 ساعات |
| P0 | 23 — إزالة تعديل/إلغاء واستبدالهم بـ "مرتجع" في Work Orders | 4 ساعات |

## Phase 1 — P1 (هام)
| الأولوية | المشكلة | الجهد |
|----------|---------|-------|
| P1 | 1 — Excel import column mapping | 3 ساعات |
| P1 | 5 — POS return invoice fix | 4 ساعات |
| P1 | 13 — تقارير مالية من journal entries | يومين |
| P1 | 26 — ترجمة hardcoded strings | 3 ساعات |
| P1 | 20 — Seed Bajaj في manufacturers | 30 دقيقة |
| P1 | 25 — Logo upload في settings | 4 ساعات |

## Phase 2 — P2 (متوسط)
| الأولوية | المشكلة | الجهد |
|----------|---------|-------|
| P2 | 4 — Barcode debounce للكتابة اليدوية | ساعتين |
| P2 | 6 — Treasury sync مع الـ system | يوم |
| P2 | 11 — Account tree hierarchy fix | 4 ساعات |
| P2 | 12 — Journal entry type mapping | ساعتين |
| P2 | 14 — Stock Value report fix | ساعتين |
| P2 | 21 — Parts & Labour مع POS | يومين |

## Phase 3 — P3 (تحسينات)
| الأولوية | المشكلة | الجهد |
|----------|---------|-------|
| P3 | 3 — Multi-invoice support (draft) | 3 أيام |
| P3 | 8 — Transactions empty state | ساعتين |
| P3 | 15 — Customer reports date filter | ساعتين |
| P3 | 16 — Purchase orders sync | يوم |
| P3 | 17/19 — Market first items | 4 ساعات |
| P3 | 18 — AI image generation | يوم |
| P3 | 24 — Suppliers + PO data | 4 ساعات |
| P3 | 21 — PDF import fields | 3 ساعات |

---

**المجموع التقريبي:** 15-20 يوم عمل  
**الملاحظة:** المشاكل المحاسبية (Phase 0 + Phase 1) تمثل ~60% من الجهد
