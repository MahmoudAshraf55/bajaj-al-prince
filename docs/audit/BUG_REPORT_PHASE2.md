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

### ✅ المشكلة 4: الباركود اليدوي — debounce محسّن (FIXED)
**التحليل والحالة الحالية:**  
- الـ commit `098715e` زاد الـ debounce من 400ms إلى 500ms
- **تحسين إضافي في هذه الجلسة:** الـ debounce التلقائي يُطلق الآن **فقط للباركود الرقمي كامل الطول** (`^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$`) — وهو النمط الذي يصدره الماسح الضوئي
- الكتابة اليدوية (أرقام جزئية أو رموز alphanumeric) **لا تُطلق التلقائي** — تتطلب Enter صريح
- هذا يمنع الإطلاق المبكر أثناء الكتابة اليدوية البطيئة، ويحافظ على عمل الماسح (الذي يرسل Enter أو يكمل باركود رقمي كامل)
- `handleBarcodeEnter` يمسح `manualBarcode` عند النجاح → لا تكرار مزدوج

**الموقع:** `src/app/admin/pos/page.tsx:176-189` (useEffect) + `POSProductGrid.tsx` (Enter handler)  
**الحالة:** ✅ RESOLVED (debounce 500ms + تمييز scanner/manual)

### ✅ المشكلة 5: مرتجع الفاتورة يعمل بشكل صحيح (FIXED)
**التحليل والحالة الحالية:**  
- الـ commit `bd6a0f3` أضاف validation + استبدل `confirm()` بـ `addToast`
- **خلل جوهري تم إصلاحه في هذه الجلسة** (`src/app/api/v1/invoices/route.ts`):
  - فحص `Insufficient stock` كان يُطبَّق على الإرجاع → يمنع إرجاع صنف والـ stock منخفض/صفر
  - **الإصلاح:** الفحص يُطبَّق الآن **فقط على `type === 'sale'`**؛ الإرجاع يزيد المخزون ولا يفشل أبداً
- **ربط المرتجع بالأصل:**
  - أُضيف عمود `returnInvoiceId` للـ `Invoice` model (Prisma migration `20260713090046_add_return_invoice_id` مُطبَّق على DB)
  - الـ frontend يمرر `returnInvoiceId: orig.id` عند الإرجاع
  - الـ API يضبط الحقل على الفاتورة الجديدة
- **حارس الإرجاع المكرر:** الـ API يرفض إنشاء return ثانٍ لنفس الفاتورة الأصلية (خطأ 400 "Invoice already returned")
- الإرجاع يعمل محاسبياً صح: يرجع المخزون (+quantity) + ينشئ قيد `RETURN` مزدوج + stock movement

**الموقع:** `src/app/api/v1/invoices/route.ts`, `src/app/admin/pos/page.tsx`, `prisma/schema.prisma`  
**الحالة:** ✅ RESOLVED (تم الإصلاح + migration مطبّق + build ناجح)

### 🔵 المشكلة 6: الخزينة مش متزامنة مع السيستم
**التحليل:**  
- الـ Treasury بيعمل fetch على `/api/v1/invoices/?limit=200`  
- بيحسب totals من invoice records مش من journal entries  
- الـ returns مش بتتنقص من total

**الموقع:** `src/app/admin/pos/page.tsx:509-529` (loadTreasury)  
**المطلوب:** ربط Treasury مع الـ accounting system (journal entries)

---

## ثالثاً: الـ Accounting — المحاسبة

### ✅ المشكلة 7: acc_summary متزامن مع النظام (FIXED)
**التحليل والحالة الحالية:**  
- الـ commit `7eecb8b` صحّح حسابات الـ summary لتقرأ من **Journal Entries** (موحّد المصدر مع TB/BS/IS)
- **المصدر الحالي (`summary/route.ts`):**
  - `revenue` من `journalEntry` type SALE (بـ `date` صحيح) ✅
  - `returns` من RETURN entries ✅
  - `purchases` من PURCHASE entries ✅
  - `expenses` = purchase + manual EXPENSE entries ✅
  - `income` من INCOME entries ✅
  - `cogs` من `journalEntryLine` account `5100` (SALE) ✅ — نفس منطق `getIncomeStatement`
- **مكملات من invoiceItems** (لا توجد كقيود منفصلة): `discounts`, `taxes`, `byCategory` — تُحسب من `invoiceItem` (تصفية بـ `invoice.createdAt` وهو طابع الفاتورة المتزامن مع `journalEntry.date`)
- الأرقام الرئيسية (revenue, cogs, netProfit) متطابقة مع Trial Balance / Balance Sheet / Income Statement

**الموقع:** `src/app/api/v1/accounting/summary/route.ts`  
**الحالة:** ✅ RESOLVED (commit 7eecb8b — مصدر موحّد من Journal Entries)

### ✅ المشكلة 8: المعاملات فاضية — تم إصلاح نطاق التاريخ (FIXED)
**التحليل والحالة الحالية:**  
- الـ Transactions API يقرأ من `journalEntry` (موحّد المصدر، ليس Invoices/WorkOrders كما في التقرير القديم)
- **السبب الجذري المكتشف:** الصفحة ترسل التاريخ بصيغة `YYYY-MM-DD` (تاريخ فقط)، والـ API كان يفسره كـ `new Date("2026-07-13")` = **منتصف الليل UTC** لكل من `from` و `to` → نافذة زمنية صفرية → لا تظهر أي قيد له وقت فعلي
- **الإصلاح (هذه الجلسة):** دالة `parseRangeDate()` توسّع التاريخ:
  - `from` → بداية اليوم **المحلي** (`YYYY-MM-DDTHH:MM:SS` = 00:00:00)
  - `to` → نهاية اليوم **المحلي** (`23:59:59.999`)
- نفس الإصلاح طُبّق على `summary` و `income-statement` (متأثرين بنفس الخلل) لضمان التزامن
- **تم التحقق:** قيد عند 10:30 وآخر عند 23:00 بالتوقيت المحلي كلاهما يُطابَق الآن ضمن نطاق اليوم

**الموقع:** `transactions/route.ts`, `summary/route.ts`, `income-statement/route.ts`  
**الحالة:** ✅ RESOLVED (إصلاح نطاق التاريخ + توسيع لبداية/نهاية اليوم)

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

### ✅ المشكلة 10: التصنيف اليومي/شهري/ربع سنوي/سنوي (FIXED)
**التحليل والحالة الحالية:**  
- `periodType` يُحسب من طول النطاق (`diffDays`): `<28=day, 28-89=month, 90-364=quarter, >=365=year` — صحيح
- الفلترة الرئيسية في `summary` و `income-statement` و `transactions` تستخدم **`journalEntry.date`** (موحّد، لا `createdAt`)
- نطاق التاريخ يُوسَّع لبداية/نهاية اليوم المحلي عبر `parseRangeDate` (إصلاح Issue 8) → التصنيف الزمني دقيق
- `createdAt` المتبقي فقط في استعلام `invoiceItems` المكمل (discounts/taxes/byCategory) — ولا يوجد حقل `date` في `Invoice`، و`createdAt` ≈ `journalEntry.date` عند الإنشاء
- التصنيف (يومي/شهري/ربع سنوي/سنوي) يعمل عبر `getDateRange()` في الصفحة + APIs

**الموقع:** `summary/route.ts:110-114`, `accounting/page.tsx:97-114`  
**الحالة:** ✅ RESOLVED (موحّد على journalEntry.date + parseRangeDate)

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

### ✅ المشكلة 12: أنواع المعاملات متطابقة ومكتملة (FIXED)
**التحليل والحالة الحالية:**  
- `JournalEntryType` enum = `SALE, RETURN, PURCHASE, EXPENSE, INCOME, STOCK_ADJUSTMENT` (schema خط 1050)
- فلتر `journal-entries/route.ts` يستخدم نفس الـ enum تماماً (`z.enum([...])` خط 12) → `where.type` يتطابق
- `createDoubleEntry()` input type مماثل (`journal.ts:21`)
- **كل الأنواع الستة تُنشأ فعلياً:**
  - `SALE/RETURN/PURCHASE` ← `invoices/route.ts`
  - `PURCHASE` ← `purchase-orders/[id]/receive`
  - `EXPENSE/INCOME` ← `cashier/route.ts` + `journal-entries/route.ts` (يدوي)
  - `STOCK_ADJUSTMENT` ← `inventory-counts/[id]` + `stock-movements/route.ts`
- لا يوجد تعارض في type mapping — الفلاتر ترجع بيانات لكل نوع له قيود

**الموقع:** `journal-entries/route.ts`, `lib/journal.ts`, `prisma/schema.prisma`  
**الحالة:** ✅ RESOLVED (الأنواع متطابقة عبر schema/filter/creation)

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

### ✅ المشكلة 14: تقرير قيمة المخزن (Stock Value) يعمل (FIXED)
**التحليل والحالة الحالية:**  
- `stock_value` report (`inventory/route.ts:67-99`) يحسب `stockValue` بـ `costPrice` مع fallback للـ `price` عند null/0:
  - `const cost = Number(p.costPrice || 0); entry.stockValue += (cost > 0 ? cost : Number(p.price)) * p.stock;`
- يحسب أيضاً `retailValue` (price × stock) و`potentialProfit` و breakdown `byCategory`
- الـ summary report (خط 107-110) يستخدم نفس منطق الـ fallback
- **tenant isolation:** Prisma extension (`lib/prisma.ts:34-41`) يضخ `tenantId` تلقائياً في `findMany` → النتائج مقيدة بالـ tenant
- لا يوجد bug في الـ query — يعمل كما هو مطلوب

**الموقع:** `src/app/api/v1/reports/inventory/route.ts`  
**الحالة:** ✅ RESOLVED (costPrice fallback + tenant isolation عبر extension)

### ✅ المشكلة 15: تقارير العملاء متزامنة مع الفواتير (FIXED)
**التحليل والحالة الحالية:**  
- `Invoice` model لا يملك حقل `date` — الطابع الزمني هو `createdAt` (يُستخدم بشكل صحيح في الفلتر خط 23 و `lastPurchase` خط 39)
- **السبب الجذري الفعلي:** نطاق التاريخ كان يُفسر كـ midnight لـ from و to (date-only) → نافذة صفرية → لا تُطابَف الفواتير → العملاء يظهرون بـ `totalSpent = 0` (غير متزامنين)
- **الإصلاح (هذه الجلسة):** دالة `parseRangeDate()` توسّع `from`/`to` لبداية/نهاية اليوم المحلي (نفس إصلاح Issue 8)
- بعد الإصلاح: الفواتير ضمن النطاق تُطابَق → `totalSpent`, `invoiceCount`, `lastPurchase` متزامنة مع الفواتير الفعلية

**الموقع:** `src/app/api/v1/reports/customers/route.ts`  
**الحالة:** ✅ RESOLVED (إصلاح نطاق التاريخ + createdAt هو الحقل الصحيح لعدم وجود date)

---

## سابعاً: Purchase Orders — أوامر الشراء

### ✅ المشكلة 16: التزامن مع المخازن والحسابات (FIXED)
**التحليل والحالة الحالية:**  
- إنشاء أمر الشراء ينشئ `createDoubleEntry` بـ `PURCHASE` (Debit Inventory / Credit Accounts Payable) ✅
- **الاستلام الجزئي يُنشئ قيد PURCHASE** (`receive/route.ts:113-125`) ✅ — تم إصلاحه مسبقاً
- **خلل جوهري تم إصلاحه في هذه الجلسة:** الاستلام كان ينشئ `stockMovement` فقط **دون تحديث `product.stock`** → المخزون غير متزامن مع الاستلام
- **الإصلاح:** عند الاستلام، يُزاد `product.stock` بـ `+quantity` (مع تخطي `lockInventory` للمنتجات المعفاة من المخزون) — متوافق مع سلوك `invoices/route.ts`
- النتيجة: المخزن (warehouse) والحسابات (journal) متزامنان الآن عند استلام أمر الشراء

**الموقع:** `src/app/api/v1/purchase-orders/[id]/receive/route.ts`  
**الحالة:** ✅ RESOLVED (مزامنة stock + قيد PURCHASE على الاستلام)

---

## ثامناً: Market — المتجر

### ✅ المشكلة 17: تحرير/حذف أول المنتجات يعمل (FIXED)
**التحليل والحالة الحالية:**  
- `market/page.tsx` يستخدم **`p.id`** لفتح التحرير (`openEdit(p)` خط 76) والحذف (`handleDelete(p.id)` خط 288) — **ليس index**
- الـ modal يستخدم `editing?.id` للـ PATCH (`/api/v1/products/${editing.id}/` خط 114) — صحيح لكل المنتجات
- الصفحة تحمّل **كل** المنتجات (`?limit=1000&admin=true`، بدون pagination) → لا يوجد cached data أو index issue
- الـ API `/products/[id]` يدعم PATCH و DELETE بـ ID بشكل صحيح (soft delete عبر `isDeleted`)
- **لا يُعاد إنتاج الخلل:** أول المنتجات (وأي منتج) يُعدَّل/يُحذف عبر ID بنجاح

**ملاحظة:** الـ `confirm()` الأصلي في `handleDelete` مُعالَج في Issue 19

**الموقع:** `src/app/admin/market/page.tsx`, `src/app/api/v1/products/[id]/route.ts`  
**الحالة:** ✅ RESOLVED (edit/delete عبر ID، بلا pagination/index bug)

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

### ✅ المشكلة 19: زر إضافة/حذف المنتجات يعمل مع تأكيد عبر modal (FIXED)
**التحليل والحالة الحالية:**  
- زر الإضافة (`openAdd` خط 246) يعمل بشكل صحيح — `resetForm()` + `setShowModal(true)`
- الحذف كان يستخدم `confirm()` الأصلي (blocking dialog) → **استُبدل بـ modal تأكيد**:
  - `handleDelete(id)` يضبط `deleteConfirm` بدلاً من `confirm()`
  - `handleDeleteConfirm()` يرسل DELETE ويُعيد التحميل
- Modal تأكيد الحذف يظهر بـ `AlertTriangle` وأزرار Cancel/Delete

**الموقع:** `src/app/admin/market/page.tsx`  
**الحالة:** ✅ RESOLVED (confirm() → modal confirm + addToast)

---

## تاسعاً: Manufacturers — الشركات المصنعة

### ✅ المشكلة 20: BAJAJ موجود في seed + موديلات (FIXED)
**التحليل والحالة الحالية:**  
- `prisma/seed.ts` يحتوي `manufacturer.upsert` لـ Bajaj (AR/EN) ويُنشئ 8 موديلات (Pulsar N160, N250, Dominar 400, Avenger 220, Discover 125, Pulsar 180, NS160, Boxer 150)
- `scripts/setup.js` يشغّل البذرة بـ `npx tsx prisma/seed.ts`
- أُضيف تكوين `"prisma": { "seed": "npx tsx prisma/seed.ts" }` في `package.json` ليشتغل `npm run db:seed` مباشرة

**الموقع:** `prisma/seed.ts:53-80`, `package.json`  
**الحالة:** ✅ RESOLVED (seed موجود + تكوين prisma db seed)

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

### ✅ المشكلة 22: ربط فاتورة POS وفاتورة الخدمة موجود (FIXED)
**التحليل والحالة الحالية:**  
- `createInvoiceSchema` يشمل `workOrderId` (خط 32) + `returnInvoiceId` (خط 33)
- إنشاء الفاتورة يضبط `workOrderId: data.workOrderId` (خط 259)
- صفحة الـ POS ترسل `workOrderId: selectedWorkOrderId` (خط 281) عند إتمام البيع
- POSCart يعرض زر "Link Work Order" لاختيار أمر الخدمة المرتبط

**الموقع:** `src/app/api/v1/invoices/route.ts`, `src/app/admin/pos/page.tsx`  
**الحالة:** ✅ RESOLVED (workOrderId في schema + POS linkage)

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
