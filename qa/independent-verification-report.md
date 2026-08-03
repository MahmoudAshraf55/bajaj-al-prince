# Independent Verification Report — Bajaj El Prince CRM/ERP

**Date:** 2026-07-27
**Audit Type:** Independent verification pass (not continuation of prior audit)
**Auditor:** OpenCode QA Agent
**Repository:** qa/batch-1-f004-f009-f024-f031 branch, 32 commits ahead of main

---

## A. CURRENT PROJECT STATE

**Branch:** `qa/batch-1-f004-f009-f024-f031` (6 uncommitted modified files)
**Production URL:** https://bajajelprince.vercel.app
**Database:** PostgreSQL (Neon) — `ep-bitter-dew-asyleed4-pooler.c-4.eu-central-1.aws.neon.tech`
**All 166 vitest tests pass** across 19 test files
**Playwright E2E suite:** 12 spec files configured with QA seed data

### Architecture Summary
- Next.js 15 App Router + TypeScript + Tailwind CSS
- Prisma ORM with 30 models, 10 enums, 31 migrations (30 applied)
- JWT auth (jose) + bcryptjs + AsyncLocalStorage tenant isolation
- 80 API route files (~127 endpoints) under `/api/v1/`
- 3 business services: AccountingService, WorkOrderService, BookingService
- Tenant isolation via Prisma extension ($extends) injecting tenantId into queries

---

## B. PREVIOUS FINDINGS VERIFIED (Key Items)

### F-001: Admin credentials don't work on Vercel
- **Previous claim:** INVALID (deployment config issue)
- **Independent verdict:** **INVALID** ✅ Correctly classified. Code reads password from `process.env.ADMIN_INITIAL_PASSWORD`. Seed script at `prisma/seed.ts:10` handles env var correctly.

### F-004: No Forgot/Reset Password flow
- **Previous claim:** CONFIRMED
- **Independent verdict:** **CONFIRMED** ✅ Grep confirms zero forgot/reset password routes, forms, or API endpoints. No change since last audit.

### F-005: Hero `<h1>` empty in DOM
- **Previous claim:** INVALID
- **Independent verdict:** **INVALID** ✅ `Hero.tsx:111-115` renders bilingual `<span>` elements inside `<h1>`.

### F-006: Navigation duplicate links
- **Previous claim:** INVALID
- **Independent verdict:** **INVALID** ✅ Header.tsx navLinks has 7 unique entries.

### F-009: EN/AR toggle not in `<a>` elements
- **Previous claim:** ALREADY FIXED
- **Independent verdict:** **ALREADY FIXED** ✅ `LanguageSwitcher.tsx:16` uses semantic `<button>` with `aria-label`.

### F-010: Prisma `uniqueVisitor.create()` crash
- **Previous claim:** ALREADY FIXED
- **Independent verdict:** **ALREADY FIXED** ✅ `@unique` removed from `ipHash`, composite `@@unique([tenantId, ipHash])` in place.

### F-011: Warehouse & POS crash (`null.barcode`)
- **Previous claim:** ALREADY FIXED
- **Independent verdict:** **ALREADY FIXED** ✅ Optional chaining added.

### F-012: POSInvoiceDetailModal crash (`null.createdAt`)
- **Previous claim:** ALREADY FIXED
- **Independent verdict:** **ALREADY FIXED** ✅ Early return guard added.

### F-022: Dashboard inventory value incorrect
- **Previous claim:** ALREADY FIXED
- **Independent verdict:** **ALREADY FIXED** ✅ `costPrice > 0 ? costPrice : price` fallback in place.

### F-024: No error boundaries
- **Previous claim:** CONFIRMED
- **Independent verdict:** **CONFIRMED** ✅ ErrorBoundary only covers admin layout. Public routes (home, market, booking) lack error boundaries.

### F-031: Forms lack real-time validation
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `validateField()` on blur in booking form. `formErrors` per-field on customer form.

### F-048: complete-and-pay does not create InvoicePayment records
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Line 161-168 creates payments nested create. Confirmed in code.

### F-049: Work order parts route credits wrong account
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `ACCOUNT_CODES.COGS` and `ACCOUNT_CODES.INVENTORY` used in parts/route.ts.

### F-050: Complete-and-pay uses createDoubleEntry inconsistently
- **Previous claim:** FIXED
- **Independent verdict:** **PARTIALLY FIXED** ⚠️ Parts route refactored to use `createDoubleEntry`. However, complete-and-pay still uses inline manual journal entry (lines 210-240) with a **DR=CR imbalance bug** (see Section C #1 below).

### F-052: Double stock deduction
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Stock now deducted only at completion in complete-and-pay. Parts add route defers to completion.

### F-053: Client-supplied totals trusted
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `partsTotal` and `labourTotal` computed from DB. Client values ignored.

### F-055: Accounting failure silently swallowed
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Try/catch removed from accounting entries in complete-and-pay. Errors propagate.

### F-056: Invoice route `paid=0` creates payment for full total
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Changed to `data.paid > 0` condition. Credit sales correctly create zero payment records.

### F-057: WO cancellation incorrectly increments stock
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Stock increment removed from cancellation path.

### F-058: Credit sale journal entry creates zero-value entry
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `createDoubleEntry` supports `amountPaid` parameter. 3-line entry for partial payments.

### F-059: unitPrice client-overridable
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `unitPrice` removed from Zod schema in parts route. Price always from DB.

### F-060: Invoice number race condition
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Retry loop (3 attempts) with P2002 handling inside transaction.

### F-061: WorkOrderService does not check lockInventory
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `lockInventory` guard added at `WorkOrderService.ts:34-39`.

### F-063: PO number race condition + cross-tenant
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Date-prefixed + tenant-scoped number generation.

### F-066: No cross-tenant relation validation on PO
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `findFirst` scoped by tenant for supplier + product validation.

### F-076: Overpayment not validated
- **Previous claim:** FIXED
- **Independent verdict:** **PARTIALLY FIXED** ⚠️ Overpayment tolerance check exists ($0.01 tolerance) but causes DR=CR imbalance (see Section C).

### F-078: Payment + Accounting must be single transaction
- **Previous claim:** VERIFIED
- **Independent verdict:** **VERIFIED** ✅ Both complete-and-pay and invoices routes wrap all logic in `$transaction()`.

### F-147: Labour product uses random findFirst
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `isService: true` filter added.

### F-169: WO return accounting failure silently swallowed
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Try/catch removed from return route.

### F-170: Cashier expense/income not atomic
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Wrapped in `$transaction()`.

### F-171: Invoice GET/PATCH cross-tenant IDOR
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Changed `findUnique` to `findFirst` for tenantId injection.

### F-172: Manufacturers/VehicleModels GET no auth
- **Previous claim:** FIXED
- **Independent verdict:** **PARTIALLY FIXED** ⚠️ Changed from "no auth" to `withAuth` (allows viewer role). Viewer role can read manufacturers and vehicle models. This is acceptable for reference data but not the strongest restriction.

### F-173: PO receive over-receiving uses stale data
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Validation moved inside transaction.

### F-174: PO cancel from partially_received no reversal
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Stock/accounting reversal added.

### F-175: Viewer can create/modify data via withAuth routes
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Changed to `withRole(['admin','staff'])` on listed routes.

### F-176: Expenses lack category-level GL mapping
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Expense category mapping to GL accounts (5201-5204, 5300) added.

### F-177: PO items no product tenant validation
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Tenant-scoped findFirst validation added.

### F-178: Supplier delete no active PO check
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Active PO count check before delete.

### F-179: Invoice POST no customer/WO tenant validation
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `findFirst` tenant-scoped validation added.

### F-180: No supplier payment route
- **Previous claim:** FIXED
- **Independent verdict:** **NOT FULLY IMPLEMENTED** 🔴 **MIGRATION NOT APPLIED TO DATABASE.** Code exists (SupplierPayment model + API route) but migration `20260727082226_add_supplier_payment` was **never run against the live database**. Confirmed by `prisma migrate status`. API routes for supplier payments will fail with "table does not exist" on deploy.

### F-181: Dashboard outOfStockCount includes unavailable
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `p.available` filter added.

### F-182: PO PATCH trusts client-supplied totals
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ Server-computed totals from product.price × quantity.

### F-183: Purchase invoice cancellation no accounting reversal
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ PURCHASE branch reversal entry added.

### F-184: Accounting summary dedup uses wrong composite key
- **Previous claim:** FIXED
- **Independent verdict:** **FIXED** ✅ `Set<invoiceId>` dedup in place.

---

## C. PREVIOUS FINDINGS THAT ARE NOT ACTUALLY FIXED

### F-180 (Severity: Critical) — Supplier Payment Migration Never Applied
- **Claim:** ✅ FIXED
- **Reality:** Code exists but database migration NEVER APPLIED. `SupplierPayment` table, `paid`/`dueDate`/`paymentStatus` columns on `PurchaseOrder`, and `SUPPLIER_PAYMENT` enum value DO NOT EXIST in live database. Confirmed by `prisma migrate status` output.
- **Impact:** Supplier payment API routes will crash with "relation does not exist" errors on deploy.
- **Evidence:** `prisma migrate status` shows `20260727082226_add_supplier_payment` as "not yet applied"

---

## D. PARTIALLY FIXED FINDINGS

### F-050 (Severity: High) — Complete-and-pay accounting still uses inline code
- Parts route refactored to `createDoubleEntry`. But complete-and-pay still uses manual inline 3-line entry (lines 210-240) with a **DR=CR imbalance bug on overpayment**.
- See Section F #1 below.

### F-076 (Severity: High) — Overpayment tolerance causes accounting imbalance
- Tolerance check prevents overpayment > $0.01, but the journal entry doesn't handle the $0.01 edge case. DR=CR is off by up to $0.01.
- See Section F #1 below.

### F-172 (Severity: Medium) — Manufacturers only use withAuth
- Changed from "no auth" to `withAuth`. Acceptable for reference data, but F-175 pattern (use `withRole` with explicit roles) is stronger.

---

## E. IMPLEMENTED BUT UNVERIFIED

### F-180 Supplier Payment UI (`cb94dab`)
- Sidebar link and UI page added but backend route cannot function without DB migration.

---

## F. NEW FINDINGS

### FINDING-001 (Severity: Critical) — Complete-and-Pay Overpayment Causes DR=CR Imbalance
- **File:** `src/app/api/v1/work-orders/[id]/complete-and-pay/route.ts:225-240`
- **Expected:** For all journal entries: total debit = total credit
- **Actual:** When `total < amountPaid <= total + 0.01` (within tolerance):
  - DR Cash = amountPaid (= total + 0.01)
  - CR Revenue = total
  - AR line skipped (condition: `amountPaid < total` is false)
  - Net: DR = total + 0.01, CR = total. **Unbalanced by $0.01**
- **Root cause:** Line 235 uses `if (data.amountPaid < total)` — should use `<=` or cap DR Cash at `Math.min(data.amountPaid, total)`. The overpayment tolerance ($0.01) at line 60 allows this edge case but the journal entry doesn't handle it.
- **Fix options:** (1) Cap DR Cash at `total`, (2) Add change payable line when overpaid, (3) Reject any overpayment (remove tolerance), (4) Use `createDoubleEntry` which handles this correctly.

### FINDING-002 (Severity: High) — Invoice Cancel for Partial-Payment Sale Strands AR
- **File:** `src/app/api/v1/invoices/[id]/route.ts:110-121`
- **Expected:** Cancelling a partial-payment invoice should reverse the original entry (DR: Revenue, CR: Cash, CR: AR)
- **Actual:** `createDoubleEntry('RETURN', amount=total)` creates DR: Sales Revenue = total, CR: Cash = total. The Accounts Receivable portion is not credited. AR is stranded.
- **Root cause:** RETURN type always generates CR: Cash (2-line), never CR: Cash + CR: AR (3-line). `hasPartialPayment` is only checked for SALE type.
- **Fix:** Pass `amountPaid` to the RETURN entry or create custom 3-line reversal for partial-payment invoices.

### FINDING-003 (Severity: Medium) — Cashier Route Never Passes paymentMethod
- **File:** `src/app/api/v1/cashier/route.ts:70-79`
- **Expected:** If transaction was by card/transfer, the journal entry should use BANK account code.
- **Actual:** `paymentMethod` is never passed to `createDoubleEntry`. All income/expense transactions default to CASH account code (1101) regardless of actual payment method.
- **Impact:** Cash account balance is inaccurate; card/transfer income appears as cash.
- **Fix:** Pass `paymentMethod` from the request schema to `createDoubleEntry`.

### FINDING-004 (Severity: Medium) — Constants File Missing SUPPLIER_PAYMENT Type
- **File:** `src/constants/accounting.ts:47-54`
- **Expected:** `JOURNAL_ENTRY_TYPES` should include `SUPPLIER_PAYMENT` since the Prisma enum and journal.ts both support it.
- **Actual:** `SUPPLIER_PAYMENT` is missing from the TypeScript constants file.
- **Impact:** Code importing from constants would not find the supplier payment type.
- **Fix:** Add `SUPPLIER_PAYMENT: 'SUPPLIER_PAYMENT'` to `JOURNAL_ENTRY_TYPES`.

### FINDING-005 (Severity: Low) — Hardcoded Account Code in AccountingService
- **File:** `src/services/AccountingService.ts:324`
- **Expected:** `ACCOUNT_CODES.RETAINED_EARNINGS` constant
- **Actual:** Hardcoded `'3101'`
- **Impact:** Code quality/maintenance issue. Not a functional bug since value is identical.

### FINDING-006 (Severity: Medium) — API Route Error Messages Reveal Internal Details
- **File:** `src/app/api/v1/purchase-orders/[id]/receive/route.ts` and several other routes
- **Expected:** Error messages should be generic (e.g., "Internal server error") to prevent information disclosure.
- **Actual:** Several routes return raw error messages on 500 (e.g., `error instanceof Error ? error.message : 'Internal server error'` at line 101-102 of supplier-payments/route.ts).
- **Impact:** Internal DB error messages could be leaked in production.

### FINDING-007 (Severity: Low) — Invoice Route Allows Receiving on Draft Orders
- **File:** `src/app/api/v1/purchase-orders/[id]/receive/route.ts`
- **Expected:** Only "ordered" POs should be receivable.
- **Actual:** Check at line 43 validates `order.status !== 'ordered'` only. Draft orders can slip through to the `ORDERED` status check.

### FINDING-008 (Severity: Low) — No DB CHECK constraint on receivedQty vs quantity
- **Expected:** `receivedQty <= quantity` should be enforced at DB level.
- **Actual:** Only application-level validation.
- **Impact:** Race condition could still theoretically allow over-receiving despite the transaction-scoped fix (F-173). A DB CHECK constraint would provide defense in depth.

### FINDING-009 (Severity: Low) — Invoice return IDs not validated as belonging to tenant
- **File:** `src/app/api/v1/invoices/[id]/route.ts`
- **Expected:** When linking a return invoice (`returnInvoiceId`), validate it belongs to the same tenant.
- **Actual:** No tenant validation on `returnInvoiceId`.

---

## G. DATABASE/MIGRATION STATE

| Status | Count | Details |
|--------|-------|---------|
| Applied migrations | 30 | Init through `20260713133015_add_reason_to_inventory_count_items` |
| Unapplied migration | 1 | `20260727082226_add_supplier_payment` — **NEVER RUN** |
| Migration gap | 1 | F-180 (SupplierPayment, PO fields, SUPPLIER_PAYMENT enum) |
| Prisma vs DB diff | Minimal | Only F-180 additions missing from live DB |

**`prisma migrate status` confirmed:** `20260727082226_add_supplier_payment` has not been applied.

---

## H. BUSINESS LOGIC INTEGRITY

| Workflow | Status | Notes |
|----------|--------|-------|
| Customer -> Vehicle -> Booking -> WO | ✅ Complete | Timeline links all entities |
| WO Parts + Labour -> Complete -> Invoice | ⚠️ Bug | DR=CR imbalance on overpayment (Finding-001) |
| WO Return | ✅ Correct | Multi-line reversal proven algebraically balanced |
| POS Sale -> Invoice -> Payment | ✅ Correct | via `createDoubleEntry` |
| PO -> Receive -> Stock Increase | ✅ Correct | DR Inventory, CR AP |
| PO Cancel after Receive | ✅ Correct | Reversal entry created |
| Supplier Payment | 🔴 Non-functional | Migration not applied |
| Inventory Count | ✅ Correct | Variance tracking with reason field |
| Accounting Period Close | ⚠️ Untested | Code reviewed as correct but no test coverage |

---

## I. ACCOUNTING INTEGRITY

| Route | DR=CR Always? | Notes |
|-------|--------------|-------|
| `createDoubleEntry` (journal.ts) | ✅ YES | Algebraically proven for all code paths |
| complete-and-pay | ❌ **NO** | Off by $0.01 on overpayment (Finding-001) |
| invoices/ POST | ✅ YES | Uses `createDoubleEntry` |
| invoices/[id]/ PATCH (cancel) | ✅ YES per entry | Wrong accounts for partial-payment reversal |
| purchase-orders/receive | ✅ YES | DR Inventory, CR AP |
| purchase-orders/status (cancel) | ✅ YES | DR AP, CR Inventory |
| supplier-payments POST | ✅ YES | DR AP, CR Cash (but migration not applied) |
| cashier POST | ✅ YES | Always DR=CR but wrong account (no paymentMethod) |
| work-orders return | ✅ YES | Multi-line reversal algebraically proven |

---

## J. INVENTORY INTEGRITY

| Operation | Stock Correct? | Notes |
|-----------|---------------|-------|
| PO Receive | ✅ Verified | Stock incremented correctly |
| POS Sale | ✅ Verified | Stock decremented via invoice creation |
| WO Complete | ✅ Verified | Stock decremented for parts (lockInventory respected) |
| WO Cancel | ✅ Verified | No stock restoration (was never deducted) |
| WO Return | ✅ Verified | Stock restored for returned parts |
| Inventory Count | ✅ Verified | Variance computed, actualQty updates stock |
| Stock Adjustment | ✅ Verified | Direct stock movement API |

---

## K. TENANT ISOLATION

**Verification depth:** Static code analysis + test quality assessment

**Mechanism:** Prisma `$extends` query middleware with `withTenantFilterWhere`, `withTenantUniqueWhere`, `withTenantData`, `withTenantUpdate`, `withTenantUpdateMany`, `withTenantUpsert` functions.

**Coverage gaps in test suite:**
- `upsert`, `createMany`, `updateMany`, `deleteMany`, `count`, `aggregate`, `groupBy` not tested at unit level for tenant isolation
- All tests use mocked Prisma — **no real DB tenant isolation test exists**
- E2E Playwright tenant isolation test (`e2e/tenant-isolation.spec.ts`) exists but actual test quality needs live verification

**Finding:** The mechanism is well-designed and the logic is tested at the unit level, but there is **zero test coverage against a real database** with multi-tenant data.

---

## L. RBAC

**Verdict:** Consistently applied across all admin API routes. All financial/data routes use `withRole(['admin','staff'])`. Admin-only operations (period close, user management, settings) use `withRole(['admin'])`.

**Exceptions (intentional):**
- `bookings/` POST — public (customer booking form)
- `contact/` POST — public with rate limiting
- `products/` GET — public (market browsing)
- `public/settings/` GET — public (site settings)
- `chatbot/` POST — public with rate limiting
- `features/check/` GET — public with rate limiting

**Minor finding:** `manufacturers/` GET and `vehicle-models/` GET use `withAuth` (any authenticated user including viewer) per F-172 fix. This was changed from "no auth" to "any auth". Acceptable for reference data.

---

## M. API SECURITY

| Aspect | Status | Notes |
|--------|--------|-------|
| Rate limiting | ✅ Present on all write routes + public GET routes | Consistent application |
| Security headers | ✅ Applied everywhere | `withSecurityHeaders` wrapper used consistently |
| Zod validation | ✅ Present on all mutation routes | Consistent throughout |
| CSP | 🟡 Partial | Missing HSTS, no `frame-ancestors` directive |
| Auth middleware | ✅ Correct | Edge middleware with silent refresh |
| Token rotation | ✅ Implemented | tokenVersion field on User + refresh tokens |
| Lockout | ✅ Implemented | failedAttempts + lockedUntil |
| Error info disclosure | ⚠️ Partial | Some routes return raw error message on 500 (Finding-006) |

---

## N. FRONTEND/BACKEND CONTRACT

No major discrepancies identified. Frontend uses SWR for data fetching on 5 pages. API JSON shapes are consistent.

---

## O. E2E/BROWSER VERIFICATION

**Playwright E2E suite:**
- 12 spec files configured
- QA seed data script (`e2e/seed-qa.ts`) creates isolated test tenant
- P0 test runner (`e2e/run-p0-tests.ts`) exists
- Tests cover: API health, auth, bookings, contact, admin CRUD, full integration flow, tenant isolation, security

**Assessment:** Setup is well-designed. Actual test execution was not performed in this audit.

---

## P. DASHBOARD VS DATABASE RECONCILIATION

Not tested — requires API calls with valid auth token against live database. Code reviews show dashboard stats route (`dashboard/stats/route.ts`) queries DB directly and computes metrics (today's invoices, revenue, bookings, low stock). No obvious discrepancies detected in static analysis.

---

## Q. TEST QUALITY

### Summary
| Metric | Value |
|--------|-------|
| Test files | 19 |
| Tests | 166 (all passing) |
| Use real DB | 0 |
| Mock Prisma | 7 files (all unused mocks) |
| Test actual API routes | 2 files |
| Test DR=CR accounting | 1 file (work-order-flow.test.ts) |
| Test tenant isolation | 2 files (logic-level only, no DB) |
| Superficial tests | 1 (sentry.test.ts — only no-DSN path) |
| Test logger | 1 (correlation ID only, not actual logging) |

### Key Gaps
1. **No tests use a real database** — every Prisma call is mocked
2. **No real tenant isolation E2E tests** against a database with multi-tenant data
3. **Sentry tests** only cover the "no DSN" path
4. **Logger tests** only test correlation ID, not actual logging
5. **Rate limiter tests** only test in-memory fallback (no Upstash/Redis path)
6. **No concurrency tests** for race conditions

---

## R. PERFORMANCE

Not measured in static audit. Key observations:
- Pagination implemented on all list routes (skip/take pattern)
- Prisma includes eager-loaded (no N+1 detected)
- Dashboard/accounting routes compute aggregations via application logic (not DB aggregation) — may suffer at scale

---

## S. PRODUCTION READINESS

### Strengths
- ✅ Tenant isolation mechanism is well-designed
- ✅ RBAC consistently applied
- ✅ Accounting atomicity via $transaction
- ✅ Rate limiting on sensitive endpoints
- ✅ Zod validation on all mutations
- ✅ Security headers on all responses
- ✅ Password complexity enforcement
- ✅ JWT with refresh token rotation
- ✅ Audit logging on all mutations
- ✅ Soft-delete pattern throughout

### Critical Blockers
1. **🔴 F-180 migration not applied** — supplier payments route non-functional on deploy
2. **🔴 complete-and-pay overpayment causes DR=CR imbalance** — accounting integrity violation

### High Priority Issues
3. **🟠 Invoice cancel strands AR** for partial-payment invoices
4. **🟠 Cashier route ignores paymentMethod** — all transactions recorded as cash

### Medium Issues
5. **🟡 Constants file missing SUPPLIER_PAYMENT** type
6. **🟡 Error messages may leak internals** on some routes
7. **🟡 No real DB test coverage** for tenant isolation

### Low Issues
8. **🟢 Hardcoded account code '3101'** in AccountingService
9. **🟢 Receiving allowed on draft POs**
10. **🟢 No DB CHECK constraint on receivedQty**

---

## T. FINAL PRIORITY LIST

| Priority | Issue | Severity | Effort | Type |
|----------|-------|----------|--------|------|
| P0 | F-180: Apply supplier payment migration to DB | 🔴 Critical | Minimal | Migration |
| P0 | Complete-and-pay overpayment DR=CR imbalance (Finding-001) | 🔴 Critical | Small | Accounting Bug |
| P1 | Invoice cancel AR stranding (Finding-002) | 🟠 High | Small | Accounting Bug |
| P1 | Cashier paymentMethod missing (Finding-003) | 🟠 High | Small | Accounting Bug |
| P2 | Constants SUPPLIER_PAYMENT missing (Finding-004) | 🟡 Medium | Trivial | Code Quality |
| P2 | Error message info disclosure (Finding-006) | 🟡 Medium | Small | Security |
| P3 | Hardcoded account code (Finding-005) | 🟢 Low | Trivial | Code Quality |
| P3 | Draft PO receiving allowed (Finding-007) | 🟢 Low | Small | Validation |
| P3 | DB CHECK constraint on receivedQty (Finding-008) | 🟢 Low | Small | Data Integrity |
| P3 | Return invoice tenant validation (Finding-009) | 🟢 Low | Small | Security |

---

*Report compiled from static code analysis, database schema comparison, migration status verification, test quality assessment, and accounting integrity verification. No live E2E tests were executed.*
