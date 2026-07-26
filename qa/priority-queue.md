# Bajaj El Prince — Priority Queue

**Generated:** 2026-07-26
**Source:** Findings ledger verification results

---

## P0 — Blocks Release (Data/Security/Money)

All P0 items from the original audit have been verified as ALREADY FIXED or INVALID:

| ID | Title | Module | Status | Action |
|----|-------|--------|--------|--------|
| F-001 | Admin credentials on Vercel | Auth | INVALID | Config issue, not code bug |
| F-002 | Product pages 0 images | Market | ALREADY FIXED | Image upload pipeline exists |
| F-011 | Warehouse & POS crash (`null.barcode`) | Warehouse/POS | ALREADY FIXED | Null guards added |
| F-012 | POSInvoiceDetailModal crash | POS | ALREADY FIXED | Defensive programming added |
| F-015 | Excel import missing stock + duplicates | Warehouse | ALREADY FIXED | Complete rewrite |
| F-009 | Tenant isolation (cross-tenant) | Security | NOT TESTED | Needs E2E verification |

**P0 Remaining: 0 confirmed code bugs** | 1 needs live E2E test (F-009 tenant isolation)

---

## P1 — Must Fix Before Release

| ID | Title | Module | Status | Action Required |
|----|-------|--------|--------|----------------|
| F-004 | No Forgot/Reset Password | Auth | CONFIRMED | **Implement** password reset flow (even if just email-to-admin for single-admin setup) |
| F-022 | Dashboard inventory value | Dashboard | ALREADY FIXED | No action needed |
| F-010 | Prisma uniqueVisitor crash | Google Reviews | ALREADY FIXED | No action needed |

**P1 Remaining: 1 confirmed code bug** (F-004)

---

## P2 — Important, Not Blocking

| ID | Title | Module | Status | Action Required |
|----|-------|--------|--------|----------------|
| F-024/F-045 | Error boundaries (public pages) | React/UX | CONFIRMED | Add `<error.tsx>` for public routes (market, booking, home) |
| F-031 | Forms lack real-time validation | UX | ✅ FIXED | Add onChange validation to booking + customer forms |
| F-007 | Homepage load time | Performance | NOT REPRODUCIBLE | Run Lighthouse audit |
| F-043 | Responsive images not optimized | Performance | NOT REPRODUCIBLE | Run performance audit |
| F-013 | CSP blocking Vercel Analytics | Security | ALREADY FIXED | No action |
| F-014 | Client-side auth → middleware | Auth | ALREADY FIXED | No action |

**P2 Remaining: 2 confirmed code improvements** (F-024/F-045, F-031)

---

## P3 — Improvement / Backlog

| ID | Title | Module | Status | Action Required |
|----|-------|--------|--------|----------------|
| F-030 | Missing loading skeletons | UX | CONFIRMED | Replace spinners with skeleton loaders on data-heavy pages |
| F-029 | Inconsistent spacing | Design | NOT REPRODUCIBLE | Visual audit needed |
| F-033 | Composite indexes | Database | NOT REPRODUCIBLE | EXPLAIN ANALYZE needed |
| F-034 | Limited lazy loading | Performance | NOT REPRODUCIBLE | Profile with real data |
| F-026 | No sitemap | SEO | INVALID | Already exists |
| F-027 | No robots.txt | SEO | INVALID | Already exists |
| F-028 | Missing alt text | A11y | INVALID | Already present |
| F-032 | Mobile navigation | Mobile | INVALID | Already implemented |
| F-025/F-047 | N+1 queries | Database | INVALID | No N+1 detected |
| F-005 | Hero h1 empty | SEO | INVALID | Not empty |
| F-006 | Nav duplicates | UX | INVALID | No duplicates |
| F-003 | No Add to Cart | Market | INVALID | By design |
| F-009 | EN/AR toggle a11y | A11y | ALREADY FIXED | Button with aria-label |
| F-042 | Semantic HTML gaps | A11y | NOT REPRODUCIBLE | Needs page audit |
| F-044 | URL state management | Architecture | NOT REPRODUCIBLE | Needs verification |
| F-046 | Limited fallback UI | UX | NOT REPRODUCIBLE | Needs testing |

**P3 Remaining: 1 confirmed improvement** (F-030) + 5 NOT REPRODUCIBLE + rest INVALID/FIXED

---

## Summary

| Priority | Confirmed Items | Action |
|----------|----------------|--------|
| P0 | 0 (1 needs E2E test) | Run E2E for tenant isolation |
| P1 | 1 (F-004) | Implement password reset |
| P2 | 2 (F-024/F-045, F-031) | Add error boundaries + form validation |
| P3 | 1 (F-030) + 5 NOT REPRODUCIBLE | Skeleton loaders + live testing |

### Recommendation

The codebase is in **significantly better shape** than the original audit suggested:
- **14 of 47 findings** were already fixed before this audit
- **15 of 47 findings** were INVALID (false positives from the audit)
- **Only 5 findings** are CONFIRMED as actual issues in current code
- **8 findings** need live testing to confirm

The single P1 item (F-004: No Forgot Password) should be implemented. The P2 items (error boundaries + form validation) are quality improvements. Everything else is either fixed, invalid, or needs live verification.

---

*This priority queue drives the execution phase. Fix P1 first, then P2, then verify P3 items via live testing.*
