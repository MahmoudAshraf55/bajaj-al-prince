# Bajaj El Prince — Architecture & Module Map

**Generated:** 2026-07-26
**Source:** Codebase inspection + report extraction
**Status:** VERIFIED against current code

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | ^15.5.19 |
| UI Library | React | ^19.1.0 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| ORM | Prisma | ^6.19.3 |
| Database | PostgreSQL (Neon) | — |
| Auth | jose (JWT) + bcryptjs | ^6.0.10 / ^3.0.3 |
| Validation | Zod | ^3.24.2 |
| State (Client) | Zustand | ^5.0.14 |
| Data Fetching | SWR | ^2.4.2 |
| 3D Graphics | Three.js + R3F + Drei | ^0.184 / ^9.6.1 / ^10.7.7 |
| Animation | GSAP + Framer Motion | ^3.15 / ^12.10 |
| Charts | Recharts | — |
| WhatsApp | Baileys | ^7.0.0-rc13 |
| PDF | pdf-lib + pdf-parse | ^1.17 / ^2.4 |
| Excel | xlsx | ^0.18.5 |
| Testing (Unit) | Vitest | ^4.1.9 |
| Testing (E2E) | Playwright | ^1.60.0 |
| Deployment | Vercel | — |
| Logging | Pino | — |

---

## 2. Database Models (42)

### Core Business
| Model | Purpose |
|-------|---------|
| `Tenant` | Multi-tenant root entity |
| `User` | Authentication + RBAC (admin/staff/viewer) |
| `Customer` | CRM — customer profiles |
| `Vehicle` | CRM — vehicle inventory per customer |
| `Manufacturer` | Vehicle manufacturer lookup |
| `VehicleModel` | Vehicle model lookup |

### Service Pipeline
| Model | Purpose |
|-------|---------|
| `Booking` | Service booking requests (→ Work Order) |
| `WorkOrder` | Active service jobs |
| `WorkOrderPart` | Parts consumed in a work order |
| `WorkOrderLabour` | Labour entries in a work order |

### Sales & Invoicing
| Model | Purpose |
|-------|---------|
| `Invoice` | Sales invoices (from POS or Work Orders) |
| `InvoiceItem` | Line items on invoices |
| `InvoicePayment` | Payment records against invoices |

### Inventory & Purchasing
| Model | Purpose |
|-------|---------|
| `Product` | Spare parts catalog (662 active) |
| `StockMovement` | Inventory audit trail |
| `BarcodeScanLog` | Barcode scan events |
| `ScannerSession` | Scanner session tracking |
| `Supplier` | Supplier management |
| `PurchaseOrder` | Purchase orders |
| `PurchaseOrderItem` | PO line items |
| `PurchaseReceipt` | Goods received notes |
| `PurchaseReceiptItem` | GRN line items |
| `InventoryCount` | Physical inventory counts |
| `InventoryCountItem` | Count line items |

### Accounting
| Model | Purpose |
|-------|---------|
| `Account` | Chart of accounts (28 accounts) |
| `JournalEntry` | Double-entry journal headers |
| `JournalEntryLine` | Journal entry lines (debit/credit) |
| `Transaction` | Financial transactions |
| `AccountingPeriod` | Fiscal period management |

### WhatsApp
| Model | Purpose |
|-------|---------|
| `WhatsAppSettings` | WhatsApp connection config |
| `WhatsAppMessageTemplate` | Message templates |
| `ReminderSchedule` | Automated reminder scheduling |
| `ReminderLog` | Reminder delivery log |

### System & Security
| Model | Purpose |
|-------|---------|
| `AuditLog` | Audit trail for all state changes |
| `Permission` | RBAC permission definitions |
| `RolePermission` | Role → Permission mapping |
| `FeatureFlag` | Feature flags |
| `TenantFeatureFlag` | Per-tenant feature toggles |
| `AppSetting` | Application settings |
| `ContactMessage` | Public contact form submissions |
| `Review` | Customer reviews |
| `UniqueVisitor` | Visitor tracking |

---

## 3. API Routes (82 route files)

### Auth (`/api/auth/`)
| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/auth/login` | POST | Login | No |
| `/auth/logout` | POST | Logout | Yes |
| `/auth/refresh` | POST | Refresh token | Yes (cookie) |
| `/auth/me` | GET | Current user | Yes |

### Core Domain (`/api/v1/`)
| Module | Endpoints | Methods |
|--------|-----------|---------|
| Customers | `/customers`, `/customers/[id]`, `/customers/[id]/timeline`, `/customers/export` | GET, POST, PATCH, DELETE |
| Vehicles | `/vehicles`, `/vehicles/[id]`, `/vehicle-models`, `/vehicle-models/[id]`, `/manufacturers`, `/manufacturers/[id]` | GET, POST, PATCH, DELETE |
| Work Orders | `/work-orders`, `/work-orders/[id]`, `/work-orders/[id]/parts`, `/work-orders/[id]/labour`, `/work-orders/[id]/return`, `/work-orders/[id]/complete-and-pay` | GET, POST, PATCH, DELETE |
| Bookings | `/bookings`, `/bookings/[id]` | GET, POST, PATCH |
| Invoices | `/invoices`, `/invoices/[id]`, `/invoices/export` | GET, POST, PATCH |
| Products | `/products`, `/products/[id]`, `/products/low-stock`, `/products/export`, `/products/import-excel`, `/products/import-pdf` | GET, POST, PATCH, DELETE |

### Inventory & Purchasing
| Module | Endpoints | Methods |
|--------|-----------|---------|
| Stock | `/stock-movements`, `/barcode`, `/scan-logs` | GET, POST |
| Inventory Counts | `/inventory-counts`, `/inventory-counts/[id]` | GET, POST, PATCH, DELETE |
| Suppliers | `/suppliers`, `/suppliers/[id]` | GET, POST, PATCH, DELETE |
| Purchase Orders | `/purchase-orders`, `/purchase-orders/[id]`, `/purchase-orders/[id]/items`, `/purchase-orders/[id]/status`, `/purchase-orders/[id]/receive`, `/purchase-orders/[id]/pdf`, `/purchase-orders/[id]/import-pdf` | GET, POST, PATCH, DELETE |

### Accounting
| Module | Endpoints | Methods |
|--------|-----------|---------|
| Accounts | `/accounts`, `/accounts/[id]` | GET, POST, PATCH, DELETE |
| Journal | `/journal-entries`, `/journal-entries/[id]` | GET, POST |
| Reports | `/accounting/summary`, `/accounting/transactions`, `/accounting/balance-sheet`, `/accounting/income-statement`, `/accounting/trial-balance`, `/accounting/treasury` | GET |
| Periods | `/accounting/periods`, `/accounting/periods/[id]` | GET, POST, PATCH, DELETE |

### Admin & Config
| Module | Endpoints | Methods |
|--------|-----------|---------|
| Dashboard | `/dashboard/stats` | GET |
| Settings | `/settings`, `/settings/batch` | GET, POST |
| Features | `/features`, `/features/check` | GET, POST |
| Permissions | `/permissions`, `/role-permissions` | GET, POST |
| Users | (implied by admin layout) | CRUD |
| Reports | `/reports/financial`, `/reports/inventory`, `/reports/customers`, `/reports/customers/smart` | GET |

### Communication & AI
| Module | Endpoints | Methods |
|--------|-----------|---------|
| WhatsApp | `/whatsapp/status`, `/whatsapp/settings`, `/whatsapp/templates`, `/whatsapp/send`, `/whatsapp/disconnect`, `/whatsapp/reminder-schedules` | GET, POST, PATCH |
| AI | `/ai/describe`, `/ai/generate-image` | POST |
| Chatbot | `/chatbot` | POST |
| Contact | `/contact`, `/contact/[id]` | GET, POST, DELETE |
| Upload | `/upload` | POST |

### Public & Cron
| Module | Endpoints | Methods |
|--------|-----------|---------|
| Public | `/public/settings`, `/health`, `/tiktok-oembed`, `/google-reviews` | GET, POST |
| Cron | `/cron/reminders` | GET |

---

## 4. Page Routes (33 pages)

### Public (4)
| Route | Page |
|-------|------|
| `/(site)/page.tsx` | Marketing homepage |
| `/market/page.tsx` | Product marketplace |
| `/market/[id]/page.tsx` | Product detail |
| `/booking/page.tsx` | Service booking |

### Admin (28)
| Route | Page |
|-------|------|
| `/admin/page.tsx` | Admin root (redirect) |
| `/admin/dashboard/page.tsx` | Dashboard |
| `/admin/customers/page.tsx` | Customer list |
| `/admin/customers/[id]/page.tsx` | Customer detail |
| `/admin/vehicles/page.tsx` | Vehicle list |
| `/admin/vehicle-models/page.tsx` | Vehicle models |
| `/admin/work-orders/page.tsx` | Work orders |
| `/admin/bookings/page.tsx` | Bookings |
| `/admin/warehouse/page.tsx` | Warehouse/inventory |
| `/admin/inventory-counts/page.tsx` | Inventory counts |
| `/admin/inventory-counts/[id]/page.tsx` | Count detail |
| `/admin/accounts/page.tsx` | Chart of accounts |
| `/admin/journal-entries/page.tsx` | Journal entries |
| `/admin/accounting/page.tsx` | Accounting overview |
| `/admin/accounting/periods/page.tsx` | Period management |
| `/admin/purchase-orders/page.tsx` | Purchase orders |
| `/admin/purchase-orders/[id]/page.tsx` | PO detail |
| `/admin/purchase-orders/import/page.tsx` | PO import |
| `/admin/suppliers/page.tsx` | Supplier list |
| `/admin/suppliers/[id]/page.tsx` | Supplier detail |
| `/admin/manufacturers/page.tsx` | Manufacturers |
| `/admin/reports/page.tsx` | Reports |
| `/admin/reports/scans/page.tsx` | Scan reports |
| `/admin/whatsapp/page.tsx` | WhatsApp management |
| `/admin/devices/page.tsx` | Devices/scanners |
| `/admin/market/page.tsx` | Admin market management |
| `/admin/pos/page.tsx` | Point of Sale |
| `/admin/pos/history/page.tsx` | POS history |

### Layouts (5)
| Route | Purpose |
|-------|---------|
| `/layout.tsx` | Root layout |
| `/(site)/layout.tsx` | Marketing site layout |
| `/market/layout.tsx` | Market layout |
| `/booking/layout.tsx` | Booking layout |
| `/admin/layout.tsx` | Admin layout (sidebar + header) |

---

## 5. Components (55 files)

### Protected 3D (3) — DO NOT MODIFY
- `components/3d/MotorcycleScene.tsx`
- `components/3d/MotorcycleSceneClient.tsx`
- `components/3d/MotorcycleSceneErrorBoundary.tsx`

### POS (12)
- POSCart, POSCustomerModal, POSPaymentModal, POSWorkOrderModal, POSCompletedInvoiceModal, POSInvoiceDetailModal, POSTotals, POSTreasury, POSQuickCreateModal, POSInvoiceList, POSReceipt, POSProductGrid

### Warehouse (7)
- WHProductList, WHDetailModal, WHEditModal, WHAdjustModal, WHMovementsList, WHImportTab, WHPdfImportTab

### Customers (4)
- CustomerInfoCard, CustomerVehiclesList, CustomerInvoicesList, CustomerActivityTimeline

### Marketing (11)
- Hero, About, OurStory, Services, ServiceHighlights, WhyChooseUs, CustomerReviews, Contact, ContactInfo, FinalCTA, PaymentMethods

### UI Library (6)
- Modal, PageSpinner, Pagination, StatusBadge, GlowCard, Logo

### Shared (10)
- AdminSidebar, AdminLangWrapper, BackButton, BarcodeWebcam, ChatBot, CustomerTimeline, ErrorBoundary, LanguageContext, LanguageSwitcher, SectionNav, SettingsContext, ToastContext, useTranslation

### Layout (2)
- Header, Footer

---

## 6. Data Flow Pipelines

### Booking → Work Order → Invoice → Payment → Accounting
```
Booking (PENDING) → convert → WorkOrder (IN_PROGRESS) → complete → Invoice → Payment
    ↓                                      ↓                            ↓
  WhatsApp                          Stock deduction              Journal entries:
  confirmation                      (parts consumed)            DR: Cash/AR
                                                               CR: Revenue
                                                               DR: COGS
                                                               CR: Inventory
```

### POS Sale → Invoice → Accounting
```
POS Cart → Checkout → Invoice created → Payment processed → Journal entries
                        ↓                                      ↓
                  Stock deducted                    DR: Cash/Card
                  WhatsApp receipt                  CR: Sales Revenue
                                                    DR: COGS
                                                    CR: Inventory
```

### Purchase Order → Receive → Accounting
```
PO created → Items added → Receive → Stock increased → Journal entry
                                                DR: Inventory
                                                CR: Accounts Payable
```

### Multi-Tenant Isolation
```
Request → Middleware (JWT verify) → AsyncLocalStorage (tenantId)
    → Prisma extension (auto WHERE tenantId=X) → Response (filtered)
```

---

## 7. Auth & Security Architecture

| Control | Implementation |
|---------|---------------|
| JWT Access Token | 15-minute expiry, httpOnly cookie |
| JWT Refresh Token | 7-day expiry, rotation on use |
| Silent Refresh | Middleware attempts refresh before redirect |
| RBAC | 3 roles: admin, staff, viewer; 28 permissions |
| Rate Limiting | Upstash Redis-based (login: 5/15m, admin: 100/15m) |
| Account Lockout | 3 failed attempts → 30s lockout |
| CSP Headers | Restrictive (default-src 'self') |
| HSTS | max-age=63072000; includeSubDomains; preload |
| X-Frame-Options | DENY |
| XSS | React auto-escaping + stripHtml utility |
| CSRF | Origin/Referer validation in production |
| SQL Injection | Prisma parameterized queries |
| Password | bcryptjs 12 rounds |
| Audit Trail | AuditLog on all state changes |
| Soft Delete | isDeleted flag with auto-filter in Prisma extension |

---

## 8. Testing Infrastructure

| Type | Count | Framework | Location |
|------|-------|-----------|----------|
| Unit Tests | 17 files | Vitest | `src/lib/*.test.ts`, `src/app/api/.../*.test.ts` |
| E2E Specs | 9 files | Playwright | `e2e/*.spec.ts` |
| E2E Setup | 1 file | Playwright | `e2e/global-setup.ts` |
| Config | 2 files | — | `vitest.config.ts`, `playwright.config.ts` |

---

## 9. Deployment

| Aspect | Detail |
|--------|--------|
| Platform | Vercel (production) |
| Database | Neon PostgreSQL (serverless) |
| Domain | bajajelprince.vercel.app |
| GitHub | MahmoudAshraf55/bajaj-al-prince |
| CI/CD | GitHub Actions (if configured) |
| Secrets | DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, VERCEL_ORG_ID, VERCEL_PROJECT_ID, VERCEL_TOKEN |

---

*This document reflects the actual codebase state as of 2026-07-26, verified by glob/grep exploration.*
