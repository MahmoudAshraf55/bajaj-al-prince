# Bajaj El Prince — Test Strategy

**Generated:** 2026-07-26
**Source:** ChatGPT audit conversation extraction + current codebase analysis

---

## 1. Layered Testing Approach

### Layer 1: Static Code / API / Business Logic Audit
- **What:** Read every source file, API route, service, and schema for correctness
- **Tools:** Manual code review, grep/glob analysis, TypeScript compiler (`npx tsc --noEmit`)
- **Scope:** All 82 API routes, 42 Prisma models, 3 services, middleware, auth flow
- **Deliverable:** Findings ledger with CONFIRMED/INVALID status per finding

### Layer 2: Automated E2E via Playwright (Real User Simulation)
- **What:** Playwright scripts that act as a real user — click buttons, fill forms, navigate pages, assert outcomes
- **Tools:** Playwright (`@playwright/test` ^1.60.0), Chromium
- **Scope:** All critical user flows (login, booking, POS, work orders, accounting)
- **Rule:** NEVER trust a UI "success" message alone — always verify with Layer 3
- **Deliverable:** E2E spec files with pass/fail + screenshots

### Layer 3: Post-UI Database/API Verification
- **What:** After a Layer 2 E2E test completes, query the database/API directly to verify the actual state matches expectations
- **Tools:** Direct API calls (fetch), Prisma queries (test scripts), DB inspection
- **Scope:** Every E2E scenario must have a corresponding DB verification step
- **Deliverable:** Verification assertions that confirm data integrity

### Key Rule
> A test PASSES only if the UI success message AND the database state AND accounting entries ALL agree. Never trust the UI message alone.

---

## 2. Phased Execution Plan

### Phase 1: Freeze
- Lock codebase to a known-good commit
- Create a `qa/staging` branch for all test work
- Ensure no production data is touched

### Phase 2: System Audit (Layer 1)
- [ ] TypeScript compilation check (`npx tsc --noEmit`)
- [ ] ESLint check (`npm run lint`)
- [ ] Build check (`npm run build`)
- [ ] Review all 82 API routes for auth/validation/security
- [ ] Review Prisma schema for data integrity constraints
- [ ] Review middleware for auth bypass possibilities
- [ ] Review Zod schemas for completeness
- [ ] Verify all findings from findings-ledger.md against current code

### Phase 3: Build Test Environment
- [ ] Set up QA/staging database (seeded Neon branch or local PostgreSQL)
- [ ] Install/configure Playwright if not already present
- [ ] Create seed data for QA Test Tenant:
  - 1 Admin user, 1 Staff user, 1 Viewer user
  - 5 sample customers with vehicles
  - 20 sample products with stock
  - 3 sample bookings
  - 2 sample work orders
  - 1 supplier
  - 1 purchase order
- [ ] Verify multi-tenant isolation in test environment

### Phase 4: Human Scenarios
Before automating, manually walk through each scenario and note expected outcomes:
1. Login as admin → see dashboard → navigate to each section
2. Create a customer → add a vehicle → create a booking → convert to work order → add parts + labour → complete → invoice → payment
3. POS: Add items to cart → apply discount → process payment → verify invoice
4. Warehouse: Import Excel → verify products → adjust stock → verify movements
5. Accounting: Create journal entry → verify trial balance → close period

### Phase 5: Automated E2E (Layer 2 + Layer 3)
Implement E2E scenarios in priority order (see §3 below).

### Phase 6: Integration & Data Integrity
- [ ] Verify accounting entries match business operations
- [ ] Verify stock movements match inventory changes
- [ ] Verify invoice totals match line items
- [ ] Verify payment records match invoice amounts
- [ ] Verify dashboard stats match database state

### Phase 7: Security
- [ ] Test JWT token expiration and refresh
- [ ] Test RBAC enforcement (viewer cannot write, staff cannot delete)
- [ ] Test rate limiting on login and admin endpoints
- [ ] Test CSP headers block unauthorized scripts
- [ ] Test XSS via input fields
- [ ] Test CSRF protection
- [ ] Test tenant isolation (accessing other tenant's data)

### Phase 8: Performance
- [ ] Measure homepage load time (target: <3s)
- [ ] Measure market page load with 660 products
- [ ] Measure API response times for key endpoints
- [ ] Identify N+1 queries via query logging

---

## 3. E2E Scenarios

### Naming Convention
```
E2E-{NNN}-{short-name}
```
Examples: `E2E-001-customer-to-payment`, `E2E-002-pos-checkout`

### Scenario Registry

| ID | Scenario | Layer 2 (UI) | Layer 3 (DB) | Priority |
|----|----------|-------------|--------------|----------|
| E2E-001 | **Full Service Pipeline:** Customer → Vehicle → Booking → Work Order → Parts + Labour → Invoice → Payment → Dashboard reconciliation | Login, create customer, create vehicle, create booking, convert to WO, add parts, add labour, complete WO, verify invoice, process payment | Verify customer exists, vehicle linked, booking status = COMPLETED, WO status = COMPLETED, invoice items match, payment recorded, journal entries balanced (DR = CR), stock decremented | P0 |
| E2E-002 | **POS Checkout:** Add items → discount → payment → invoice | Open POS, scan/add products, apply discount, process cash payment, verify change | Verify invoice created, stock decremented, journal entries (DR: Cash, CR: Revenue + DR: COGS, CR: Inventory) | P0 |
| E2E-003 | **Payment Idempotency:** Double-submit payment | Process payment, attempt to process same payment again | Verify only one payment recorded, invoice status = PAID (not DOUBLE-PAID) | P0 |
| E2E-004 | **Work Order Return:** Complete WO → return parts | Complete WO with parts, then return parts | Verify stock restored, invoice adjusted or credit note created, journal entries reversed | P1 |
| E2E-005 | **Work Order Cancel:** Cancel a work order | Create WO, add parts, cancel | Verify WO status = CANCELLED, stock restored (if deducted), no invoice created | P1 |
| E2E-006 | **Purchase Order Lifecycle:** Create PO → add items → receive → stock increase | Create PO, add items, receive PO | Verify stock increased, journal entry (DR: Inventory, CR: AP), PO status = RECEIVED | P1 |
| E2E-007 | **Supplier Payment:** Pay a supplier | Open supplier PO, receive goods, process payment to supplier | Verify payment recorded, AP decremented, cash decremented, journal entries balanced | P1 |
| E2E-008 | **Permission Matrix:** Test all 4 roles | Login as each role, attempt actions | Verify admin can CRUD all, staff can create/read/update, viewer can only read, unauthorized redirects | P1 |
| E2E-009 | **Tenant Isolation:** Cross-tenant access prevention | Attempt to access another tenant's data via URL manipulation | Verify API returns 403/404, no data leakage | P0 |
| E2E-010 | **Dashboard vs DB Reconciliation:** Dashboard stats match actual data | Read dashboard stats | Query DB for same metrics (today's invoices, revenue, pending bookings, low stock) and compare | P1 |
| E2E-011 | **Booking Flow (Public):** Customer books via public page | Fill booking form with valid data, submit | Verify booking created in DB with status PENDING, customer linked, vehicle created | P1 |
| E2E-012 | **Market Browse:** Search + filter + pagination | Search products, filter by category, paginate | Verify correct products returned, pagination metadata correct | P2 |
| E2E-013 | **Excel Import:** Upload → preview → approve → verify | Upload Excel file, review diffs, approve all, verify products | Verify new products created, existing products updated, stock added correctly | P1 |
| E2E-014 | **Accounting Period Close:** Close a period → verify locked | Close an accounting period | Verify period status = CLOSED, no new entries can be posted to closed period | P1 |
| E2E-015 | **Auth Flow:** Login → token refresh → logout → unauthorized access | Login, wait for token expiry, verify silent refresh, logout, attempt admin access | Verify refresh works, logout clears tokens, redirect to login after logout | P0 |

---

## 4. Permission Matrix (per F-194 concept)

| Action | Admin | Staff | Viewer | Unauthenticated |
|--------|-------|-------|--------|----------------|
| View Dashboard | ✅ | ✅ | ✅ | ❌ → Login |
| Create Customer | ✅ | ✅ | ❌ | ❌ |
| Edit Customer | ✅ | ✅ | ❌ | ❌ |
| Delete Customer | ✅ | ❌ | ❌ | ❌ |
| Create Work Order | ✅ | ✅ | ❌ | ❌ |
| Complete Work Order | ✅ | ✅ | ❌ | ❌ |
| Process POS Sale | ✅ | ✅ | ❌ | ❌ |
| Create Journal Entry | ✅ | ❌ | ❌ | ❌ |
| Close Accounting Period | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ❌ |
| Import Excel | ✅ | ✅ | ❌ | ❌ |
| Adjust Stock | ✅ | ✅ | ❌ | ❌ |
| View Market (Public) | ✅ | ✅ | ✅ | ✅ |
| Book Service (Public) | ✅ | ✅ | ✅ | ✅ |

### Ambiguity Markers (?)
- Can Staff delete their own work orders? → **?** Needs clarification
- Can Staff process refunds? → **?** Needs clarification
- Can Viewer export data? → **?** Needs clarification

---

## 5. Test Data Requirements

### QA Test Tenant
```
Tenant: QA Test Center
Slug: qa-test
```

### Users
| Username | Role | Password |
|----------|------|----------|
| qa-admin | admin | Test@12345 |
| qa-staff | staff | Test@12345 |
| qa-viewer | viewer | Test@12345 |

### Sample Data
- 5 customers with 8 vehicles
- 20 products across categories (3W, 2W, COM)
- 3 bookings (PENDING, CONFIRMED, COMPLETED)
- 2 work orders (IN_PROGRESS, COMPLETED)
- 1 supplier with 1 purchase order
- Chart of accounts pre-seeded

---

## 6. Regression Strategy

After each P0/P1 fix:
1. Re-run the specific E2E scenario that covers the fixed area
2. Run adjacent scenarios that share the same data paths
3. Run the full P0 suite to ensure no regressions
4. Compare before/after dashboard stats

---

*This strategy document defines how to verify and test the Bajaj El Prince system. Execution follows in Phase 2 (verification) and Phase 5 (automation).*
