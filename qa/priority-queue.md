# Bajaj El Prince — Priority Queue

**Generated:** 2026-07-26
**Updated:** 2026-07-26 (Phase 3 E2E findings added)
**Source:** Findings ledger verification + live E2E testing

---

## P0 — Blocks Release (Data/Security/Money)

| ID | Title | Module | Status | Action |
|----|-------|--------|--------|--------|
| F-048 | `complete-and-pay` skips `InvoicePayment` records | Accounting | ✅ FIXED | Added `payments` nested create |
| F-049 | Parts route credits `1201` instead of `1104` | Accounting | ✅ FIXED | Changed to `ACCOUNT_CODES.INVENTORY` |
| F-001 | Admin credentials on Vercel | Auth | INVALID | No action |
| F-011 | Warehouse & POS crash | Warehouse/POS | ALREADY FIXED | No action |
| F-012 | POSInvoiceDetailModal crash | POS | ALREADY FIXED | No action |

**P0: 0 remaining** — all fixed

---

## P1 — Must Fix Before Release

| ID | Title | Module | Status | Action Required |
|----|-------|--------|--------|----------------|
| F-050 | WO routes bypass `createDoubleEntry()` abstraction | Accounting | ✅ FIXED | Parts route now uses `createDoubleEntry()` |
| F-051 | COGS orphaned on WO cancellation | Accounting | ✅ FIXED | Added reversal logic in PATCH handler |
| F-004 | No Forgot/Reset Password | Auth | ✅ FIXED | Endpoint + 5 unit tests |

**P1: 0 remaining** — all fixed

---

## P2 — Important, Not Blocking

| ID | Title | Module | Status | Action Required |
|----|-------|--------|--------|----------------|
| F-024/F-045 | Error boundaries | React/UX | ✅ FIXED | |
| F-031 | Forms lack real-time validation | UX | ✅ FIXED | |
| F-009 | Tenant isolation | Security | ✅ FIXED | 14 unit tests |

**P2: 0 remaining** — all fixed

---

## P3 — Improvement / Backlog

| ID | Title | Module | Status | Action Required |
|----|-------|--------|--------|----------------|
| F-030 | Missing loading skeletons | UX | CONFIRMED | Skeleton loaders on data-heavy pages |

**P3: 1 remaining** (F-030)

---

## Summary

| Priority | Items | Status |
|----------|-------|--------|
| P0 | 2 → | ✅ All fixed |
| P1 | 3 → | ✅ All fixed |
| P2 | 3 → | ✅ All fixed |
| P3 | 1 | 🟡 Enhancement |

### All Fixes This Session

| Finding | Fix | Files |
|---------|-----|-------|
| F-004 | Password recovery endpoint + 5 tests | `recover/route.ts`, `recover/route.test.ts`, `audit.ts` |
| F-009 | 14 tenant isolation tests | `tenant-isolation.test.ts` |
| F-024/F-045 | Error boundaries + not-found | 5 new files |
| F-031 | Real-time form validation | `booking/page.tsx`, `customers/page.tsx` |
| F-048 | InvoicePayment in complete-and-pay | `complete-and-pay/route.ts` |
| F-049 | Correct account codes | `parts/route.ts` |
| F-050 | createDoubleEntry in parts route | `parts/route.ts`, `journal.ts` |
| F-051 | COGS reversal on WO cancellation | `work-orders/[id]/route.ts` |

### E2E Test Results: 4/4 pass ✅

### Branch: `qa/batch-1-f004-f009-f024-f031`

---

*All P0/P1/P2 items resolved. Only P3 (skeleton loaders) remains as enhancement.*
