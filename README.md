# EL PRINCE BAJAJ — Enterprise Motorcycle ERP Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma)](https://prisma.io/)
[![Playwright](https://img.shields.io/badge/Playwright-1.60-2EAD33?logo=playwright)](https://playwright.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?logo=vitest)](https://vitest.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

> **Full-stack ERP platform for Bajaj motorcycle service centers.**
> Multi-tenant, double-entry accounting, POS, inventory, CRM, purchase orders, and financial reporting — all in one intelligent platform.

---

## 📸 Screenshots

### Admin Portal (14 Pages)

| Dashboard | POS System | Suppliers |
|:---:|:---:|:---:|
| ![Dashboard](public/screenshots/admin/admin-dashboard.png) | ![POS](public/screenshots/admin/admin-pos.png) | ![Suppliers](public/screenshots/admin/admin-suppliers.png) |

| Purchase Orders | Chart of Accounts | Journal Entries |
|:---:|:---:|:---:|
| ![POs](public/screenshots/admin/admin-purchase-orders.png) | ![Accounts](public/screenshots/admin/admin-accounts.png) | ![Journal](public/screenshots/admin/admin-journal-entries.png) |

| Reports | Warehouse | Accounting |
|:---:|:---:|:---:|
| ![Reports](public/screenshots/admin/admin-reports.png) | ![Warehouse](public/screenshots/admin/admin-warehouse.png) | ![Accounting](public/screenshots/admin/admin-accounting.png) |

| Inventory Counts | CRM / Customers | Vehicles |
|:---:|:---:|:---:|
| ![Inventory](public/screenshots/admin/admin-inventory-counts.png) | ![Customers](public/screenshots/admin/admin-customers.png) | ![Vehicles](public/screenshots/admin/admin-vehicles.png) |

| Work Orders | Vehicle Models |
|:---:|:---:|
| ![Work Orders](public/screenshots/admin/admin-work-orders.png) | ![Models](public/screenshots/admin/admin-vehicle-models.png) |

### Public Website

| Home — 3D Hero | Market / Catalog | Booking |
|:---:|:---:|:---:|
| ![Home](public/screenshots/public/home-hero.png) | ![Market](public/screenshots/public/market.png) | ![Booking](public/screenshots/public/booking.png) |

---

## 🚀 Live Demo

> **Production URL:** [https://windsurf-project-three-topaz.vercel.app](https://windsurf-project-three-topaz.vercel.app)
>
> **Admin Login:** `admin` / `Admin@123`
> **Admin Panel:** [https://windsurf-project-three-topaz.vercel.app/admin](https://windsurf-project-three-topaz.vercel.app/admin)

---

## ✨ Features

### 🏢 Core ERP Modules

| Module | Description |
|--------|-------------|
| **POS (Point of Sale)** | Barcode scanning, split payments (cash + card + transfer), receipt printing, customer attach |
| **Inventory / Warehouse** | Stock tracking, low-stock alerts, import Excel, adjust quantities, stock movements |
| **Accounting** | Double-entry journal entries, chart of accounts, accounting periods |
| **Purchase Orders** | Supplier management, purchase orders with status workflow (draft → ordered → received), receiving |
| **CRM** | Customer profiles, vehicle garage, service history, activity timeline |
| **Work Orders** | Service intake, mechanic assignment, completion, WhatsApp notifications |
| **Reports** | P&L, balance sheet, cash flow, inventory stock value, low stock, top customers |
| **Reminders** | WhatsApp bulk messaging, automated follow-up schedules, anti-ban sending |

### 🔐 Security & Compliance

- **Multi-Tenant Isolation** — Every query auto-scoped to tenant via AsyncLocalStorage + Prisma extension
- **RBAC** — Granular permissions (`admin` / `staff` / `viewer`) with per-route enforcement
- **Feature Flags** — Toggle features per tenant without redeployment
- **Audit Log** — Every mutation tracked with before/after values, IP, and user agent
- **Input Sanitization** — Zod schemas with XSS prevention via `sanitizedString()`
- **Rate Limiting** — Redis (Upstash) or in-memory fallback with per-endpoint configuration
- **CSP Headers** — Strict Content-Security-Policy, X-Frame-Options, HSTS
- **Soft Delete** — No destructive deletes; all records retain history

### 🧪 Testing & Observability

- **38 Unit Tests** — Vitest (tenant context, journal account mapping, XSS sanitization, correlation IDs)
- **31+ E2E Tests** — Playwright (auth, booking, API, tenant isolation, admin CRUD, security)
- **Sentry Integration** — Error tracking with automatic initialization via `instrumentation.ts`
- **Structured Logging** — JSON logs with correlation IDs for traceability
- **Health Checks** — `/api/health/` verifies DB and Redis connectivity

---

## 🏗 Architecture

```
bajaj-al-prince/
├── prisma/
│   ├── schema.prisma              # 36+ models, all tenant-scoped
│   ├── migrations/                 # Manual & auto-generated migrations
│   ├── seed.ts                     # Default tenant, admin user, vehicle models
│   └── seed-accounts.ts           # Chart of accounts: 28 default accounts
├── public/
│   ├── models/                     # 3D motorcycle models (PROTECTED)
│   └── screenshots/               # Demo screenshots
├── src/
│   ├── app/
│   │   ├── (site)/                 # Public website with 3D hero
│   │   ├── admin/                  # 22 admin pages
│   │   │   ├── dashboard/          # 8 KPI cards + payment breakdown
│   │   │   ├── pos/                # Point of sale with split payments
│   │   │   ├── warehouse/          # Inventory management
│   │   │   ├── accounting/         # P&L, chart of accounts, journal
│   │   │   ├── inventory-counts/   # Stock counting workflow
│   │   │   ├── customers/          # CRM with garage/vehicles
│   │   │   ├── vehicles/           # Vehicle directory
│   │   │   ├── vehicle-models/     # Predefined models
│   │   │   ├── work-orders/        # Service tracking
│   │   │   ├── suppliers/          # Supplier management
│   │   │   ├── purchase-orders/    # PO + receiving workflow
│   │   │   ├── accounts/           # Chart of accounts tree
│   │   │   ├── journal-entries/    # Double-entry ledger
│   │   │   ├── reports/            # Financial + inventory + customer
│   │   │   └── whatsapp/           # WhatsApp QR + templates
│   │   ├── api/
│   │   │   ├── auth/               # Login, logout, refresh, me
│   │   │   ├── health/             # Health check endpoint
│   │   │   └── v1/                 # Versioned API (50+ endpoints)
│   │   │       ├── dashboard/stats/    # Aggregated KPIs
│   │   │       ├── suppliers/          # Supplier CRUD
│   │   │       ├── purchase-orders/    # PO CRUD + status + receive
│   │   │       ├── accounts/           # Chart of accounts CRUD
│   │   │       ├── journal-entries/    # Double-entry API
│   │   │       ├── reports/            # Financial, inventory, customer
│   │   │       ├── invoices/           # Invoice with split payments
│   │   │       ├── inventory-counts/   # Stock counting
│   │   │       ├── products/           # Product CRUD + export
│   │   │       ├── customers/          # Customer CRUD + timeline + export
│   │   │       └── cron/               # WhatsApp reminders (Vercel Cron)
│   │   ├── booking/                # Public booking page
│   │   ├── market/                 # Server-rendered catalog + [id] detail
│   │   └── layout.tsx              # Root layout (JSON-LD, skip link, Sentry)
│   ├── components/
│   │   ├── 3d/                     # Three.js / R3F (PROTECTED)
│   │   ├── layout/                 # Header, Footer, AdminSidebar
│   │   ├── sections/               # Hero, WhyUs, Services, Contact, TikTok
│   │   ├── pos/                    # POSCart, POSReceipt, POSProductGrid
│   │   └── ui/                     # Logo, BackButton, GlowCard, ErrorBoundary
│   ├── lib/
│   │   ├── prisma.ts               # Extended Prisma client (tenant + soft delete)
│   │   ├── auth.ts                 # withAuth/withRole/withPermission wrappers
│   │   ├── permissions.ts          # Granular permission definitions
│   │   ├── features.ts             # Feature flag service
│   │   ├── tenant-context.ts       # AsyncLocalStorage tenant isolation
│   │   ├── journal.ts              # Double-entry helper + account mapping
│   │   ├── logger.ts               # Structured JSON logging + correlation IDs
│   │   ├── rate-limit.ts           # Redis/in-memory rate limiting
│   │   ├── sanitize.ts             # XSS prevention Zod helper
│   │   ├── audit.ts                # Audit logging with sensitive key redaction
│   │   ├── security.ts             # CSP, CORS, security headers
│   │   ├── export-excel.ts         # Excel export helper
│   │   └── sentry.ts              # Error tracking (lazy-loaded)
│   ├── schemas/                    # Shared Zod schemas
│   └── types/                      # TypeScript type declarations
├── e2e/                            # Playwright E2E tests
│   ├── admin.spec.ts               # Admin login & management
│   ├── admin-crud.spec.ts          # Suppliers, POs, accounts, reports
│   ├── api.spec.ts                 # API health & auth
│   ├── booking.spec.ts             # Booking flow
│   ├── contact.spec.ts             # Contact form
│   ├── home.spec.ts                # Home page
│   ├── security.spec.ts            # Auth, SQLi, XSS, rate limit, tenant
│   └── tenant-isolation.spec.ts    # Multi-tenant verification
├── docs/
│   ├── ENTERPRISE_AUDIT_REPORT.md  # Full audit findings & phased plan
│   ├── DISASTER_RECOVERY.md        # Backup, restore, failover procedures
│   ├── SYSTEM_RULES.md             # Security & operational controls
│   ├── PROJECT_RULES.md            # Coding conventions
│   └── AGENTS.md                   # Agent workflow & approval guardrails
├── .github/workflows/ci.yml        # CI/CD: typecheck → lint → tests → E2E → deploy
├── vitest.config.ts                # Unit test configuration
├── playwright.config.ts            # E2E test configuration (5 browser projects)
├── vercel.json                     # Vercel deployment + WhatsApp cron config
└── next.config.mjs                 # Next.js config (image optimization + rewrites)
```

---

## 📊 Database Models (36+ Models)

### Core Business

| Model | Purpose |
|-------|---------|
| `Invoice` + `InvoiceItem` + `InvoicePayment` | Sales, purchases, returns with split payment tracking |
| `Product` | Inventory catalog with stock, pricing, tax, categories |
| `Customer` + `Vehicle` + `VehicleModel` | CRM with garage/vehicle ownership |
| `Booking` | Service appointments with status workflow |
| `WorkOrder` | Service intake, mechanic notes, cost tracking |
| `Transaction` | Manual income/expense entries |
| `StockMovement` | Inventory adjustments, sales, purchases |

### Suppliers & Procurement

| Model | Purpose |
|-------|---------|
| `Supplier` | Vendor profiles with tax ID, contact info |
| `PurchaseOrder` + `PurchaseOrderItem` | Purchase orders with status workflow |
| `PurchaseReceipt` + `PurchaseReceiptItem` | Goods receiving with partial delivery |

### Accounting & Finance

| Model | Purpose |
|-------|---------|
| `Account` | Chart of accounts (assets, liabilities, equity, revenue, expenses) |
| `JournalEntry` + `JournalEntryLine` | Double-entry accounting with debit/credit lines |
| `AccountingPeriod` | Financial period management (open/closed/locked) |

### Platform & Security

| Model | Purpose |
|-------|---------|
| `User` | Admin/staff authentication with account lockout |
| `Tenant` | Multi-tenant isolation |
| `FeatureFlag` + `TenantFeatureFlag` | Per-tenant feature toggles |
| `Permission` + `RolePermission` | Granular RBAC |
| `AuditLog` | Immutable audit trail |
| `AppSetting` | Application configuration |

### CRM & Communication

| Model | Purpose |
|-------|---------|
| `ContactMessage` | Customer inquiries |
| `Review` | Customer reviews |
| `ReminderSchedule` | WhatsApp follow-up automation |
| `WhatsAppMessageTemplate` | Per-event message templates |
| `WhatsAppSettings` | Anti-ban configuration |
| `ReminderLog` | WhatsApp sending history |
| `UniqueVisitor` | Site visitor tracking |

---

## 🌐 API Endpoints (50+ Routes)

### Authentication (`/api/auth/`)
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/login/` | Public |
| POST | `/api/auth/logout/` | Authenticated |
| GET | `/api/auth/me/` | Authenticated |
| POST | `/api/auth/refresh/` | Refresh token |

### Dashboard & Reports (`/api/v1/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `dashboard/stats/` | Aggregated KPIs (8 metrics) |
| GET | `reports/financial/?type=pnl` | Profit & Loss statement |
| GET | `reports/financial/?type=balance` | Balance sheet |
| GET | `reports/financial/?type=cashflow` | Cash flow statement |
| GET | `reports/inventory/?type=summary` | Stock summary |
| GET | `reports/inventory/?type=low_stock` | Low stock alert |
| GET | `reports/inventory/?type=stock_value` | Stock value by category |
| GET | `reports/customers/?type=top` | Top 20 customers |
| GET | `reports/customers/?type=activity` | Customer activity |

### POS & Invoices (`/api/v1/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `invoices/` | List/create invoices (split payments) |
| GET/PATCH/DELETE | `invoices/[id]/` | Invoice detail, cancel, soft delete |
| GET | `invoices/export/` | Excel export |
| POST | `cashier/` | Manual income/expense |

### Suppliers & Purchasing (`/api/v1/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `suppliers/` | Supplier list/create |
| GET/PATCH/DELETE | `suppliers/[id]/` | Supplier detail, update, delete |
| GET/POST | `purchase-orders/` | PO list/create with items |
| GET/PATCH/DELETE | `purchase-orders/[id]/` | PO detail, update, delete |
| PATCH | `purchase-orders/[id]/status/` | Status transitions (draft→ordered→received) |
| POST | `purchase-orders/[id]/receive/` | Goods receiving with stock update |

### Accounting (`/api/v1/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `accounts/` | Chart of accounts list/create |
| GET/PATCH/DELETE | `accounts/[id]/` | Account detail, update, delete |
| GET/POST | `journal-entries/` | List/manual entry with double-entry lines |
| GET | `journal-entries/[id]/` | Single journal entry detail |

### Inventory (`/api/v1/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `products/` | Product list/create |
| PATCH | `products/[id]/` | Product update |
| GET | `products/export/` | Excel export |
| GET | `products/low-stock/` | Low stock alert |
| POST | `products/import-excel/` | Bulk import from Excel |
| POST | `stock-movements/` | Create adjustment |
| GET/POST | `inventory-counts/` | Stock counting sheets |
| GET/PATCH | `inventory-counts/[id]/` | Count detail, complete |

### CRM (`/api/v1/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `customers/` | Customer list/create |
| GET/PATCH/DELETE | `customers/[id]/` | Profile, update, soft delete |
| GET | `customers/[id]/timeline/` | Activity history |
| GET | `customers/export/` | Excel export |
| GET/POST | `vehicles/` | Vehicle list/create |
| GET/PATCH/DELETE | `vehicles/[id]/` | Detail, update, soft delete |
| GET/POST | `vehicle-models/` | Model list/create |
| PATCH/DELETE | `vehicle-models/[id]/` | Update, delete |
| GET/PATCH | `work-orders/` + `/[id]/` | Work order management |
| GET/POST | `bookings/` | Booking list/create |
| PATCH | `bookings/[id]/` | Booking status update |

### System (`/api/v1/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `contact/` | Contact messages |
| DELETE | `contact/[id]/` | Soft delete message |
| POST | `upload/` | File upload |
| GET | `cron/reminders/` | WhatsApp reminder batch |
| GET/POST | `whatsapp/` | WhatsApp settings, templates, status |

---

## 🛠 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 15 (App Router) | Server & client components, API routes |
| Language | TypeScript 5.x | Strict type safety |
| UI | React 19 + Tailwind CSS 4 | Component library + utility-first CSS |
| Animation | Framer Motion + GSAP | Page transitions + scroll animations |
| 3D | Three.js + React Three Fiber + Drei | 3D motorcycle hero experience |
| Database | PostgreSQL (Neon) | Multi-tenant relational data |
| ORM | Prisma 6.19 | Type-safe database access |
| Auth | jose + bcryptjs | JWT tokens + password hashing |
| Validation | Zod 3.24 | Schema validation + XSS sanitization |
| Icons | Lucide React | Consistent iconography |
| Testing | Vitest + Playwright | Unit (38 tests) + E2E (31+ tests) |
| Logging | Custom JSON logger | Structured logs with correlation IDs |
| Error Tracking | Sentry (lazy-loaded) | Production error monitoring |
| Rate Limit | Upstash Redis | Rate limiting with in-memory fallback |
| WhatsApp | Baileys | WhatsApp Web API integration |
| Deployment | Vercel | Serverless deployment |

---

## 🔧 Installation

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database (Neon recommended)

### Setup

```bash
# Clone
git clone https://github.com/MahmoudAshraf55/bajaj-al-prince.git
cd bajaj-al-prince

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with DATABASE_URL, JWT_SECRET, etc.

# Run migrations
npx prisma db execute --file <migration-file>.sql
npx prisma migrate resolve --applied <migration-name>
npx prisma generate

# Seed data
npx tsx prisma/seed.ts          # Admin user + vehicle models
npx tsx prisma/seed-accounts.ts  # Chart of accounts (28 accounts)

# Start development
npm run dev
# → http://localhost:3000
# → Admin: http://localhost:3000/admin (login: admin / Admin@123)
```

### Environment Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host:5432/neondb"

# Auth
JWT_SECRET="<64-char random string>"
JWT_REFRESH_SECRET="<64-char random string>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER="201015544084"
WHATSAPP_NUMBER="201015544084"

# Optional
SENTRY_DSN=""                    # Error tracking
UPSTASH_REDIS_REST_URL=""        # Redis rate limiting
UPSTASH_REDIS_REST_TOKEN=""
OPENAI_API_KEY=""                # AI image generation
POLLINATIONS_API_KEY=""          # Pollinations API
S3_BUCKET=""                     # Backup storage
ADMIN_INITIAL_PASSWORD="Admin@123"
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`npx tsc --noEmit`) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:coverage` | Unit tests + coverage |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run test:ci` | E2E tests with HTML report |
| `npm run audit` | Security audit (`npm audit --audit-level=high`) |
| `npm run db:seed` | Seed database |
| `npx prisma studio` | Database GUI |

---

## 🚀 Deploy (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (preview)
vercel

# Deploy (production)
vercel --prod
```

The project includes `vercel.json` with:
- WhatsApp cron job every 10 minutes
- Environment variable configuration
- Serverless function configuration

**Required Vercel Environment Variables:** `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL`

---

## 🧪 Testing

### Unit Tests (Vitest — 38 tests)

```bash
npm test                    # Run all 38 unit tests
npm run test:coverage       # With coverage report
```

**Coverage:** Tenant context isolation, journal account mapping (19 tests), XSS sanitization (9 tests), logger correlation IDs (4 tests), tenant context (6 tests)

### E2E Tests (Playwright — 31+ tests, 5 browser projects)

```bash
npm run test:e2e            # All browsers
npx playwright test --project=chromium  # Chromium only
```

**Test suites:**
- `admin.spec.ts` — Login, dashboard, inventory
- `admin-crud.spec.ts` — Suppliers, POs, accounts, journal, reports
- `api.spec.ts` — Health check, auth, contact
- `booking.spec.ts` — Public booking flow
- `contact.spec.ts` — Contact form validation
- `home.spec.ts` — Home page + sections
- `security.spec.ts` — Auth, SQLi, XSS, rate limit, tenant isolation
- `tenant-isolation.spec.ts` — Multi-tenant data isolation

---

## 🔒 Security

### Implemented Controls

| Control | Implementation |
|---------|---------------|
| Authentication | JWT (jose, HS256), bcrypt password hashing, account lockout after 5 failures |
| Authorization | RBAC (admin/staff/viewer) + granular permissions |
| Tenant Isolation | AsyncLocalStorage + Prisma extension auto-injecting `tenantId` |
| Input Validation | Zod schemas with `sanitizedString()` XSS prevention |
| Rate Limiting | Upstash Redis or in-memory fallback per endpoint |
| Security Headers | CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy |
| Audit Logging | Sensitive key redaction, IP + user-agent tracking |
| Soft Delete | No hard deletes, `isDeleted` filtering on all queries |
| File Upload | MIME validation, role restriction (admin/staff only) |
| Error Tracking | Sentry integration (lazy-loaded, no dependency required) |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `docs/ENTERPRISE_AUDIT_REPORT.md` | Full audit findings (18 critical, 25 medium, ~15 low issues) + 8-phase implementation plan |
| `docs/DISASTER_RECOVERY.md` | Backup strategy, restore procedure, RTO/RPO, failover |
| `docs/SYSTEM_RULES.md` | Security rules, CI controls, operational procedures |
| `docs/PROJECT_RULES.md` | Coding conventions, accessibility, performance patterns |
| `docs/AGENTS.md` | Agent workflows, protected features, approval guardrails |
| `docs/VERSIONING_STRATEGY.md` | Version numbering, release management |
| `docs/GIT_GOVERNANCE.md` | Branch strategy, commit conventions |
| `docs/BACKUP_AND_RECOVERY.md` | Backup procedures, incident response |

---

## 🏁 Implementation Status

All 8 phases of the [Enterprise Audit Plan](docs/ENTERPRISE_AUDIT_REPORT.md) are **complete**:

| Phase | Deliverable | Status |
|-------|------------|--------|
| **0** | Security hardening, secret rotation, upload hardening, rate limits | ✅ |
| **1** | Feature flags, RBAC, granular permissions, API handler wrapper | ✅ |
| **2** | Multi-tenant isolation, schema hardening, composite indexes, E2E tests | ✅ |
| **3** | Audit coverage, inventory transactions, low-stock alerts, customer timeline | ✅ |
| **4** | Suppliers, purchase orders, chart of accounts, double-entry accounting | ✅ |
| **5** | Split payments, Excel exports, financial/inventory/customer reports | ✅ |
| **6** | Dashboard KPIs, image optimization, SEO/JSON-LD, accessibility | ✅ |
| **7** | Sentry, structured logging, health checks, WhatsApp cron, backup script | ✅ |
| **8** | Vitest unit tests, expanded Playwright, CI/CD pipeline, DR docs | ✅ |

---

## 📄 License

**Proprietary Software** — All rights reserved. Unauthorized copying, distribution, or use is strictly prohibited.

---

<p align="center">
  <sub>Built with precision for EL PRINCE BAJAJ Service Centers.</sub>
  <br>
  <sub>2026 — All rights reserved.</sub>
</p>
