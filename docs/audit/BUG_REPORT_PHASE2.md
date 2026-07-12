# تقرير المرحلة الثانية — الفحص الشامل (Phase 2 Bug Report)
**التاريخ:** 12 يوليو 2026  
**الحالة:** تم الفحص — في انتظار التصحيح

---

## أولاً: الـ Warehouse — استيراد Excel/PDF

### 🔴 المشكلة 1: استيراد Excel لا يظهر معاينة ولا يستخرج البيانات
**التحليل:**  
- الكود بيستخدم `xlsx` لقراءة الملف وإخراج أول 10 صفوف preview  
- الـ column mapping يدعم الأسماء العربية: `'السعر'`, `'سعر التكلفة'`, `'المخزون'`, `'الوحدة'`, `'الضريبة'`, `'الوصف'`  
- **السبب المحتمل:** لو الـ Excel فيه header names مختلفة أو الـ `sheet_to_json` مش بيعرف يقرا الصيغة

**الموقع:** `src/app/api/v1/products/import-excel/route.ts:74-100` (parseRow) و `WHImportTab.tsx:86-127` (preview table)  
**المطلوب:** تصحيح `parseRow()` لدعم كل الصيغ المصرية + تصحيح preview لعرض 10 صفوف

### 🟠 المشكلة 2: استيراد PDF لا يستخرج البيانات كاملة
**التحليل:**  
- الـ PDF parser بيستخرج بس: name, price, sku, barcode  
- بيفتقد: nameAr, costPrice, stock, unit, description, taxRate  

**الموقع:** `src/app/api/v1/products/import-pdf/route.ts:33-71`  
**المطلوب:** تحسين `extractRows()` لاستخراج الحقول الناقصة

---

## ثانياً: الـ POS — نقطة البيع

### 🔴 المشكلة 3: لا يمكن فتح أكثر من فاتورة في نفس الوقت
**التحليل:**  
- الـ POS يستخدم `posStore` (Zustand) مع cart واحد  
- ما فيش concept الـ draft invoices أو multi-tab  
- **السبب:** تصميم معماري — الـ store مش بيسمح إلا بـ cart واحد

**الموقع:** `src/store/posStore.ts`  
**المطلوب:** إضافة multi-invoice support (draft/saved invoices)

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

### 🔴 المشكلة 9: Trial Balance / Balance Sheet / Income Statement
**التحليل:**  
- الـ reports بتستخدم `AccountingService.getTrialBalance()` و `getBalanceSheet()` و `getIncomeStatement()`  
- بيستخدموا `createdAt` مش `journalEntry.date`  
- ده كان الـ CRITICAL C1 من التقرير السابق — **لسه موجود**

**الموقع:** `src/services/AccountingService.ts:118,179,249`  
**المطلوب:** تغيير `createdAt` → `journalEntry.date` في كل التقارير

### 🟠 المشكلة 10: التصنيف اليومي/شهري/ربع سنوي/سنوي
**التحليل:**  
- الـ frontend بيبعت `from` و `to` dates  
- الـ period بيتم تحديده حسب عدد الأيام (<28 = day, 28-89 = month, إلخ)  
- **لكن الـ filtering بيستخدم `createdAt`** على Invoice/Transaction level مش journalEntry.date

**الموقع:** `src/app/api/v1/accounting/summary/route.ts:95-99`  
**المطلوب:** استخدام `journalEntry.date` بدل `createdAt` + توحيد الفلترة

---

## رابعاً: الـ Accounts — الحسابات

### 🟠 المشكلة 11: الشجرة (Tree) مش متزامنة
**التحليل:**  
- Account model عنده `parentId` — شجرة  
- الـ API بيجيب كل الحسابات و الـ frontend بيبني الشجرة  
- **السبب 1:** مفيش `isDeleted: false` فلتر في الـ API  
- **السبب 2:** الـ seed-accounts.ts شغال لكن الـ tree hierarchy مش صحيح

**الموقع:** `src/app/api/v1/accounts/route.ts:36-40`  
**المطلوب:**  
- إضافة `isDeleted: false` في query  
- فحص الـ hierarchy  
- التأكد من المسميات العربية/الإنجليزية

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

### 🔴 المشكلة 13: التقارير المالية غير دقيقة
**التحليل:**  
- P&L, Balance Sheet, Cash Flow كلهم بيقرأوا من Invoice/Transaction مباشرة  
- مش بيستخدموا journal entries  
- **السبب:** financial/route.ts عنده implementation منفصل عن AccountingService

**الموقع:** `src/app/api/v1/reports/financial/route.ts`  
**المطلوب:** توحيد التقارير على أساس journal entries

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

### 🟠 المشكلة 18: توليد الصور
**التحليل:**  
- AI image generation feature — بيعمل fetch لـ API خارجي  
- **السبب:** API endpoint مش شغال أو الـ key ناقص

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

### 🔴 المشكلة 21: Parts & Labour مش متزامنين مع POS
**التحليل:**  
- Work order system عنده service items و parts منفصلين عن POS  
- الـ `complete-and-pay` بيخلق invoice لكن بيستخدم account codes مختلفة  
- **السبب:** نظامين منفصلين

**الموقع:** `src/services/WorkOrderService.ts` و `src/app/api/v1/invoices/route.ts`  
**المطلوب:** توحيد part/labour system مع POS

### 🔴 المشكلة 22: لا يوجد ربط بين فاتورة الـ POS وفاتورة الخدمة
**التحليل:**  
- POS بيحط `workOrderId` في request بس الـ Zod schema مش بتقبله  
- **السبب:** `createInvoiceSchema` مش متضمن `workOrderId`

**الموقع:** `src/app/api/v1/invoices/route.ts:18-32`  
**المطلوب:** إضافة `workOrderId` للـ schema وربطه

### 🔴 المشكلة 23: تعديل وإلغاء مش موجودين — نستخدم "مرتجع"
**التحليل:**  
- زبون عايز يمسح "تعديل" و "إلغاء" من واجهة المستخدم ويحط "مرتجع"  
- المرتجع المفروض يرجع المخزن ويحدث الحسابات

**الموقع:** `src/app/admin/work-orders/page.tsx`  
**المطلوب:**  
- إزالة edit و cancel buttons  
- إضافة return button يعمل reverse للفاتورة + تحديث المخزن + عكس journal entry

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

### 🟠 المشكلة 25: الشعار النصي — لازم يكون في رفع لوجو
**التحليل:**  
- الـ "الشعار النصي" ده text name مش logo image  
- **السبب:** مفيش upload field للـ logo image

**الموقع:** `src/app/admin/settings/page.tsx`  
**المطلوب:** إضافة logo image upload + تغيير الـ logo في كل الموقع

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
