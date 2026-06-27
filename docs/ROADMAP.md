# Roadmap: Cashier (POS) + Warehouse + Barcode System

> ⚠️ الكاشير والمخزن مرتبطان 100% — أي عملية بيع = خصم فوري من المخزن عبر `prisma.$transaction`

---

## ✅ تم إنجازه — المرحلة 0 (قاعدة البيانات)

### Product — إضافة حقول:
`barcode`, `sku`, `nameAr`, `vehicleModel`, `activeFrom`, `costPrice`, `unit`, `lowStockThreshold`, `taxExempt`, `expiryDate`

### جداول جديدة:
- `Invoice` — فاتورة (رقم تلقائي INV-YYYYMMDD-XXXX, نوع sale/purchase/return, حالة draft/confirmed/cancelled)
- `InvoiceItem` — أصناف الفاتورة (مرتبطة بـ Product و Invoice)
- `StockMovement` — حركة المخزن (in/out/adjustment + reference + createdBy)
- `BarcodeScanLog` — سجل المسح (بكل المصادر)
- `ScannerSession` — جلسات الماسح
- `AppSetting` — إعدادات عامة (key/value)

### إنمزات جديدة:
`InvoiceType`, `InvoiceStatus`, `MovementType`, `ScanSource`, `ScanStatus`

---

## ✅ تم إنجازه — المرحلة 1 (الكاشير + المخزن)

### APIs
- `POST /api/v1/invoices/` — إنشاء فاتورة + خصم المخزون في `prisma.$transaction` (لو الكمية مش كافية → الفاتورة كلها تتراجع)
- `GET /api/v1/invoices/` — قائمة الفواتير (بحث، فلتر، pagination)
- `GET /api/v1/invoices/[id]` — تفاصيل فاتورة مع الأصناف والعميل
- `PATCH /api/v1/invoices/[id]` — إلغاء فاتورة + إعادة الكمية للمخزن
- `POST /api/v1/stock-movements/` — تعديل يدوي للمخزون (إضافة/خصم)
- `GET /api/v1/stock-movements/` — تاريخ حركة المخزن

### صفحات
- **شاشة البيع** `/admin/pos/` — بحث بالباركود والاسم، سلة مشتريات، +/- كمية، خصم، ضريبة 14% (قابلة للتعديل)، طرق دفع (نقداً/بطاقة/تحويل)، طباعة
- **قائمة الفواتير** `/admin/pos/history/` — بحث، فلتر بالنوع والحالة، عرض تفاصيل، طباعة، إلغاء فاتورة
- **شاشة المخزن** `/admin/warehouse/` — عرض كل المنتجات مع الكمية، علامة للكمية المنخفضة، تعديل يدوي (+/-)، عرض تاريخ حركة المنتج

### ترجمة
كل النصوص مترجمة EN/AR مع دعم RTL كامل

### Sidebar
ثابت ومتناسق في كل صفحات الأدمن (Dashboard, Market, POS, Warehouse, Invoices, CRM) مع `ltr:left-0 rtl:right-0`

### 1.6 ✅ Settings Page
- Settings API at `/api/v1/settings/`
- Settings page at `/admin/settings/` with tax rate config

---

## 🔄 قيد التنفيذ — المرحلة 2 (استيراد Excel)

2.1 `POST /api/v1/products/import-excel/` — رفع ملف xlsx، معاينة بيانات ← **جاري**
2.2 `POST /api/v1/products/import-excel/confirm` — تأكيد الاستيراد
2.3 واجهة الرفع (مودال في المخزن)
2.4 مكتبة `xlsx` (sheetjs)

### أعمدة Excel:
| عمود Excel | Product Field |
|-----------|--------------|
| Parts | sku (رقم القطعة) |
| Parts (مكرر) | barcode |
| en | name |
| ar | nameAr |
| mod | vehicleModel |
| cat | category |
| Start Date Active | activeFrom |
| مستهلك بالضريبة | price |

---

## ✅ تم إنجازه — المرحلة 3 (محرك الباركود الموحد)

### 3.1 ✅ Barcode Engine
`src/lib/barcode-engine.ts` — with `lookupProduct`, `logScan`, `parseBarcodeFormat`

### 3.2 ✅ Barcode API
`POST /api/v1/barcode/` — look up barcodes and log scans

### 3.3 ✅ Mobile Scanner
Page at `/admin/pos/scanner/` using `html5-qrcode`

### 3.4 ✅ Webcam Scanner
Component at `src/components/BarcodeWebcam.tsx` integrated in POS page

### 3.5 ✅ Scanner Integration
"Scan with Mobile" + "Scan with Webcam" buttons in POS

---

## 📋 المتبقي — المرحلة 4

### المرحلة 4 — لوحة المراقبة
4.1 لوحة الأجهزة `/admin/devices/`
4.2 سجل المسح
