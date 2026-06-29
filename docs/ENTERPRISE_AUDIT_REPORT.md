# Enterprise Audit & Improvement Report — Bajaj Al Prince ERP

**Audit date:** 2026-06-28  
**Scope:** Full-stack Next.js 15 ERP (App Router, Prisma/PostgreSQL, Tailwind v4, 3D Hero).  
**Auditors:** Architecture, Full-Stack, Database, Security, UI/UX, SEO, DevOps, QA, Performance, ERP Consultant.

---

## Executive Summary

The project has a **solid foundation**: strict TypeScript, clean separation of cross-cutting concerns, JWT refresh rotation, bcrypt password hashing, account lockout, soft-delete scaffolding, audit-log scaffolding, Prisma migrations, and a distinctive 3D hero experience. However, it is currently closer to a **single-tenant operational dashboard** than a world-class multi-tenant ERP. The most urgent risks are:

1. **Tenant isolation is completely unimplemented** despite `tenantId` columns existing everywhere.
2. **Soft-delete can be bypassed** via `findUnique` and by overriding `isDeleted` in queries.
3. **Authorization gaps** allow `viewer` users to mutate work orders and read accounting data.
4. **The public market page is broken** because it calls an admin-only products API.
5. **Local `.env`/`.env.local` files contain real secrets** in the working tree.
6. **File upload endpoint is over-permissive** and vulnerable to stored XSS/malware delivery.
7. **No observability, real backups, background job queue, or staging environment.**

All findings below are ordered by **safe implementation priority**, not by domain. The 3D hero (`src/components/3d/**`, `public/models/**`) was treated as protected and was not modified or recommended for modification.

---

## 1. Critical Issues

| # | Issue | Domain | Evidence |
|---|-------|--------|----------|
| 1.1 | **Tenant isolation is unimplemented.** `tenantId` exists on every model but is never read/written in code. JWT payload, middleware, and every Prisma query ignore it. | DB / Security | All API routes under `src/app/api/v1/**`, `src/lib/auth.ts`, `src/middleware.ts` |
| 1.2 | **Global unique constraints break multi-tenancy.** `Product.barcode`, `Invoice.number`, `VehicleModel.name`, `WhatsAppMessageTemplate.event`, `AppSetting.key`, `Booking` time slot, `User.username` are globally unique. | DB | `prisma/schema.prisma` |
| 1.3 | **Soft-delete bypass via `findUnique`.** Prisma extension only filters `findMany`/`findFirst`/`count`. Routes use `findUnique` on deleted records and mutate them. | DB / Security | `src/lib/prisma.ts`, `src/app/api/v1/products/[id]/route.ts`, `customers/[id]/route.ts`, `vehicles/[id]/route.ts`, `bookings/[id]/route.ts`, `invoices/[id]/route.ts`, etc. |
| 1.4 | **Public market page calls admin-only API and returns 401.** | Functional / Architecture | `src/app/market/page.tsx` fetches `/api/products/?limit=1000`; `src/app/api/v1/products/route.ts` requires `admin`/`staff` |
| 1.5 | **`.env` and `.env.local` contain plaintext secrets** (DB password, JWT secrets, API keys, Vercel token). | Security | `/.env`, `/.env.local` |
| 1.6 | **Weak default admin credentials** in setup/reset scripts. | Security | `scripts/setup.js`, `scripts/reset-admin-pass.ts` |
| 1.7 | **File upload allows arbitrary files** by any authenticated user including `viewer`. | Security | `src/app/api/v1/upload/route.ts` |
| 1.8 | **Inventory-count completion is non-transactional.** Partial failures leave stock, movements, and journals inconsistent. No audit log or rate limit. | DB / Integrity | `src/app/api/v1/inventory-counts/[id]/route.ts` |
| 1.9 | **No observability.** Sentry is stubbed; `@sentry/nextjs` not installed. | Infra | `src/lib/sentry.ts` |
| 1.10 | **No real backups.** `scripts/backup.sh` writes local files only; docs claim encrypted S3 with 30-day retention. | Infra / DR | `scripts/backup.sh`, `docs/BACKUP_AND_RECOVERY.md` |
| 1.11 | **No background job queue.** WhatsApp reminders run synchronously inside an HTTP `GET` handler and can timeout. | Reliability | `src/app/api/v1/cron/reminders/route.ts` |
| 1.12 | **Uploads are stored on ephemeral local disk** (`public/uploads/`). On serverless this data is lost between invocations. | Infra | `src/app/api/v1/upload/route.ts`, `src/app/api/v1/ai/generate-image/route.ts` |
| 1.13 | **High-severity dependency vulnerability** in `xlsx` (used by product import). | Security | `package.json`, `package-lock.json` |
| 1.14 | **Authorization gaps:** `viewer` can create/update/delete work orders and read accounting summary/transactions. | Security | `src/app/api/v1/work-orders/**`, `src/app/api/v1/accounting/summary/route.ts`, `accounting/transactions/route.ts` |
| 1.15 | **Access tokens remain valid after logout/role change** for up to 1 hour. | Security | `src/app/api/auth/logout/route.ts`, `src/lib/auth.ts` |
| 1.16 | **Audit-log sanitization bug:** `SENSITIVE_KEYS` uses mixed case but checks lowercase, so secrets are not redacted. | Security | `src/lib/audit.ts` |
| 1.17 | **Accounting-period guard is inverted.** Allows mutations when no period exists. | DB / Integrity | `src/lib/accounting.ts` |
| 1.18 | **No unit/integration test framework.** Only Playwright E2E exists. | QA | `package.json` |

---

## 2. Medium Issues

| # | Issue | Domain | Evidence |
|---|-------|--------|----------|
| 2.1 | Inconsistent rate limiting across API routes (many `GET` endpoints unprotected). | Security | Most `src/app/api/v1/**/route.ts` |
| 2.2 | Inconsistent `withSecurityHeaders` usage. | Security | Multiple API routes |
| 2.3 | `x-forwarded-for` trusted without proxy validation. | Security | `src/lib/rate-limit.ts`, `src/lib/audit.ts` |
| 2.4 | In-memory rate-limit fallback is weaker than Redis and not cross-instance safe. | Security / Scalability | `src/lib/rate-limit.ts` |
| 2.5 | `passwordSchema` defined but never enforced. | Security | `src/lib/auth.ts` |
| 2.6 | Zod schemas not centralized under `src/schemas/` (live schema is in ignored `/zod/` folder). | Architecture | `zod/customerSchema.ts`, `.gitignore` |
| 2.7 | `useTranslation` hook placed in `src/components/` instead of `src/hooks/`. | Architecture | `src/components/useTranslation.ts` |
| 2.8 | `next.config.mjs` disables image optimization globally. | Performance / SEO | `next.config.mjs` |
| 2.9 | Public `GET` endpoints (`google-reviews`, `tiktok-oembed`) unrate-limited and can be abused. | Security | `src/app/api/google-reviews/route.ts`, `src/app/api/tiktok-oembed/route.ts` |
| 2.10 | Duplicate section IDs (`services`, `contact`) break in-page navigation. | UX / Accessibility | `src/components/sections/Services.tsx`, `WhyChooseUs.tsx`, `Contact.tsx`, `ContactInfo.tsx` |
| 2.11 | SSR `lang="en" dir="ltr"` hardcoded; Arabic users get wrong initial language declaration. | Accessibility / SEO | `src/app/layout.tsx`, `src/components/LanguageContext.tsx` |
| 2.12 | Toasts and loading spinners lack live-region semantics. | Accessibility | `src/components/ToastContext.tsx`, `src/app/loading.tsx` |
| 2.13 | Many icon-only controls lack accessible names. | Accessibility | POS, warehouse, work-orders, chatbot, dashboard |
| 2.14 | Modals lack ARIA semantics, focus trap, and Escape handling. | Accessibility | Admin POS, warehouse, work-orders, customers, reviews |
| 2.15 | Tables lack `scope` attributes. | Accessibility | Admin tables across CRM, warehouse, accounting |
| 2.16 | Missing canonical URLs, `metadataBase`, OpenGraph images, favicon assets, manifest. | SEO | `src/app/layout.tsx` |
| 2.17 | Market products fetched client-side; no server-rendered catalog or product detail pages. | SEO | `src/app/market/page.tsx` |
| 2.18 | No structured data / JSON-LD. | SEO | Public pages |
| 2.19 | CI does not run tests, audits, or migrations. | DevOps | `.github/workflows/ci.yml` |
| 2.20 | No staging environment or branch-specific deploys. | DevOps | `.github/workflows/ci.yml` |
| 2.21 | No connection pooling / retry config for Prisma. | Performance / Scalability | `src/lib/prisma.ts` |
| 2.22 | No application-level caching strategy. | Performance | API routes, `next.config.mjs` |
| 2.23 | `WhatsAppSettings` and `AppSetting` lack soft-delete columns. | DB | `prisma/schema.prisma` |
| 2.24 | `Transaction.createdBy` is plain string, not FK; `ReminderLog` lacks FKs. | DB / Integrity | `prisma/schema.prisma` |
| 2.25 | `InvoiceItem` lacks `@@unique([invoiceId, productId])`. | DB / Integrity | `prisma/schema.prisma` |

---

## 3. Low-Priority Improvements

- Refactor pagination parsing into a shared helper.
- Add `updatedAt` to `AuditLog` and consider partitioning.
- Add DB CHECK constraints for invoice totals, positive quantities, etc.
- Normalize enum vs raw-string status fields.
- Add `caption` to data tables.
- Add `prefers-reduced-motion` global styles for non-hero animations.
- Expand Playwright to Firefox/WebKit/mobile.
- Add `@next/bundle-analyzer` and Lighthouse CI.
- Add pre-commit hooks (husky/lint-staged).
- Add Dependabot/Renovate.
- Standardize error response shapes.
- Add API documentation / OpenAPI spec.

---

## 4. Architecture Recommendations

1. **Introduce a route-wrapper abstraction** (`withApiHandler`) that composes auth, rate limiting, security headers, audit logging, validation, and pagination parsing. This eliminates duplication and inconsistencies.
2. **Create canonical module boundaries:**
   - `src/schemas/` — all Zod schemas.
   - `src/hooks/` — all reusable React hooks (move `useTranslation`).
   - `src/lib/features/` — per-domain server helpers (accounting, inventory, CRM).
3. **Implement tenant context** in auth/session layer and enforce it automatically via Prisma extension or `requireTenant` helper.
4. **Fix soft-delete coverage** by extending the Prisma client to override `findUnique`, `findUniqueOrThrow`, `findFirstOrThrow`, `aggregate`, `groupBy`, and by adding a `softDelete()` model method.
5. **Standardize error handling** with typed errors (`AuthError`, `ForbiddenError`, `ValidationError`, `NotFoundError`) and a single serializer.
6. **Separate public read APIs from admin APIs** (e.g., `/api/v1/public/products`) to avoid the current market-page breakage.
7. **Move long-running operations to a queue** (BullMQ/Redis or Vercel Cron) for WhatsApp, reports, imports, AI generation.

---

## 5. Security Recommendations

| Priority | Action |
|----------|--------|
| Critical | Remove `.env`/`.env.local` from working tree; rotate ALL secrets; verify `.gitignore`. |
| Critical | Fix `scripts/setup.js` and `scripts/reset-admin-pass.ts` to generate/accept strong passwords and enforce `passwordSchema`. |
| Critical | Harden upload endpoint: restrict to `admin`/`staff`, validate MIME via magic bytes, allow-list extensions, rename files, store off local disk. |
| High | Apply `requireRole(['admin','staff'])` to work-orders, accounting, and upload routes. |
| High | Fix soft-delete bypass in Prisma extension or every `findUnique` call. |
| High | Unify rate limits; configure Upstash in production; add rate limits to upload, chatbot, public GET endpoints. |
| Medium | Add CSRF/origin validation to all state-changing admin routes. |
| Medium | Implement access-token blocklist (Redis) or reduce token lifetime for instant revocation. |
| Medium | Add trusted-proxy logic for IP extraction. |
| Low | Tighten CSP by removing `unsafe-inline`/`unsafe-eval` where possible; add `__Host-` cookie prefixes. |

---

## 6. Performance Recommendations

1. **Remove global `images.unoptimized: true`** and only opt-out specific images when required.
2. **Compress `public/Logo.png`** (2.1 MB) to < 100 KB.
3. **Defer TikTok iframe** (`loading="lazy"`) and 3D scene initialization until after first paint where possible.
4. **Add connection pooling** (PgBouncer / Prisma Accelerate) and query timeouts.
5. **Implement caching:** Redis for hot reads (settings, product catalog), Next.js `unstable_cache`/`revalidate` for public pages.
6. **Audit bundle size** with `@next/bundle-analyzer`; lazy-load heavy admin modules.
7. **Add Lighthouse CI** thresholds (LCP < 2.5s, INP < 200ms, CLS < 0.1).

---

## 7. SEO Recommendations

1. Add `metadataBase`, canonical URLs, OpenGraph/Twitter images, favicon, apple-touch-icon, and `site.webmanifest` in root layout.
2. Server-render the market catalog; create dynamic product detail routes `/market/[slug]`.
3. Add JSON-LD: `Organization`, `LocalBusiness`/`AutoRepair`, `WebSite`, `Product`, `BreadcrumbList`.
4. Implement bilingual SEO strategy (`/ar/` subpaths or `hreflang`) and server-render correct `lang`/`dir`.
5. Set `NEXT_PUBLIC_APP_URL` in production so sitemap/robots use real domain.
6. Add `robots: { index: false }` to `not-found.tsx`.

---

## 8. UX / Accessibility Recommendations

1. Fix duplicate section IDs; translate or remove unused `Services.tsx`/`Contact.tsx`.
2. Set correct SSR `lang`/`dir` from cookie or default to saved preference.
3. Add `aria-label` to every icon-only button.
4. Add live regions to toasts and loading spinners (`role="status"`, `aria-live`).
5. Add skip-to-content links in site and admin layouts.
6. Refactor modals with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape-to-close, and focus return.
7. Associate all form inputs with labels (`htmlFor`/`id` or `aria-label`).
8. Add `scope="col"`/`scope="row"` to all tables.
9. Move all hardcoded UI strings into `translations.ts`.
10. Add `eslint-plugin-jsx-a11y` to CI.

---

## 9. Database Recommendations

1. Add `Tenant` model; backfill default tenant; make `tenantId` non-nullable on tenant-scoped tables.
2. Replace global unique constraints with tenant-scoped composites (`@@unique([tenantId, barcode])`, etc.).
3. Fix soft-delete extension to cover all read methods and prevent `isDeleted` override.
4. Add missing FKs: `ReminderLog.customer`/`booking`, `Transaction.createdBy` → `User`.
5. Add `@@unique([invoiceId, productId])` on `InvoiceItem`.
6. Add soft-delete columns to `AppSetting` and `WhatsAppSettings`.
7. Fix accounting-period guard to require an explicit `open` period.
8. Add composite indexes for common tenant-scoped query patterns.

---

## 10. Safe Implementation Plan

> **Principles:** No destructive migrations without rollback. Feature flags for every major feature. Preserve existing routes, data, and business logic. Validate with `npx tsc --noEmit` and `npm run build` after every phase.

### Phase 0 — Safety & Foundation (MUST be first)
1. Rotate secrets; remove `.env`/`.env.local` from working tree; update `.gitignore` and setup docs.
2. Fix default admin passwords in setup/reset scripts.
3. Harden upload endpoint (role restriction, MIME/extension validation, move off local disk or at least ignore `public/uploads/`).
4. Fix immediate broken functionality: public market page (create public products API or make existing GET public).
5. Fix soft-delete bypass in Prisma extension.
6. Fix authorization gaps on work-orders/accounting/upload routes.
7. Add rate limiting and security headers to the most exposed endpoints.

### Phase 1 — Feature Flags & RBAC Foundation
1. Add `FeatureFlag` and `TenantFeatureFlag` models.
2. Implement server-side feature-flag service and React hook.
3. Define granular permission constants and `Permission` model linked to roles.
4. Refactor `requireRole` to `requirePermission`; maintain backward compatibility with existing `admin`/`staff`/`viewer` roles.
5. Add a route wrapper (`withApiHandler`) that applies auth, permission, rate limit, audit, validation, and security headers consistently.

### Phase 2 — Tenant Isolation & Schema Hardening
1. Add `Tenant` model; backfill existing data; make `tenantId` non-nullable.
2. Update unique constraints to include `tenantId`.
3. Add tenant context to JWT payload and middleware.
4. Update Prisma extension to auto-inject `tenantId` into every query.
5. Add missing FKs and `InvoiceItem` uniqueness.
6. Add composite indexes.
7. Write E2E tests proving tenant A cannot access tenant B data.

### Phase 3 — Audit Logging, Inventory, CRM Timeline
1. Fix audit-log sanitization; add audit coverage to settings, accounting periods, inventory-count completion.
2. Wrap inventory-count completion in a Prisma transaction.
3. Add low-stock alerts and reorder-point reporting.
4. Build customer activity timeline aggregating bookings, invoices, work orders, vehicles.

### Phase 4 — Suppliers, Purchase Orders, Accounting
1. Add `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseReceipt` models.
2. Implement receiving workflow and stock impact.
3. Add Chart of Accounts (`Account` model) and double-entry journal lines.
4. Refactor invoice/stock/accounting integration to use double-entry lines.

### Phase 5 — POS, Payments, Reporting
1. Add mixed payment methods on invoices.
2. Add PDF/Excel export and print-friendly reports.
3. Add financial, inventory, and customer reports.

### Phase 6 — Dashboard, Performance, SEO, Accessibility
1. Add configurable dashboard widgets and KPI cards.
2. Re-enable image optimization; compress assets; defer heavy embeds.
3. Implement canonical/OG/JSON-LD; server-render market; add product detail pages.
4. Fix accessibility gaps: IDs, labels, live regions, modals, table scopes, skip links.

### Phase 7 — Observability, Monitoring, Backup/DR
1. Install/configure Sentry; add `instrumentation.ts` and `global-error.tsx`.
2. Add structured logging with correlation IDs.
3. Implement real encrypted backups to S3/R2 with restore tests.
4. Add health checks for Redis, WhatsApp, SMTP.
5. Replace synchronous WhatsApp cron with queue/Cron.
6. Document and test disaster recovery procedures.

### Phase 8 — Testing & CI/CD Hardening
1. Add Vitest unit/integration harness.
2. Expand Playwright coverage (Firefox/WebKit/mobile, admin CRUD, security scenarios).
3. Update CI to run typecheck, lint, unit tests, E2E tests, `npm audit`, and `prisma migrate deploy`.
4. Add staging and production deployment workflows.

---

## 11. Validation Checklist for Each Phase

Before approving any phase:

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes with no new warnings.
- [ ] Playwright E2E tests pass.
- [ ] Security review (auth, validation, secrets, tenant isolation).
- [ ] No protected 3D feature modified without explicit approval + report.
- [ ] Migration has rollback plan and backup validation.
- [ ] Audit logs and rate limits applied to new endpoints.

---

## 12. Protected Feature Statement

The 3D Hero Motorcycle experience (`src/components/3d/**`, `public/models/**`, and routes mounting these components) was reviewed but **not modified** and **not recommended for modification** during this audit. Any future changes to GSAP ScrollTrigger, React Three Fiber, camera, model positioning, opacity, or scroll behavior require explicit maintainer approval, visual regression tests, performance profiling, and E2E validation per `docs/AGENTS.md`.
