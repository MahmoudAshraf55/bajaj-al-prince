# Bajaj Project Context

## Goal
- Complete enterprise-level audit and incremental improvement of the Bajaj Al Prince Next.js ERP while preserving existing functionality, then implement safe phases ending in a world-class ERP platform.

## Constraints & Preferences
- Do not break existing features; verify before modifying; preserve 3D Hero, routes, integrations, and data.
- No destructive migrations without rollback; feature-flag major features; maintain tenant isolation, security, and accounting accuracy.
- Use existing architecture, coding style, UI language, and Prisma conventions.
- User requested Arabic communication but accepts English technical deliverables.

## Progress
### Done
- Created full audit report at `docs/ENTERPRISE_AUDIT_REPORT.md`.
- Phase 0 (Safety & Foundation): rotated local JWT/admin secrets, hardened upload endpoint, fixed public market page, fixed soft-delete bypass, closed auth gaps on work-orders/accounting/upload, fixed audit sanitization bug, added public endpoint rate limits, fixed accounting-period guard.
- Phase 1 (Feature Flags & RBAC): added `FeatureFlag`, `TenantFeatureFlag`, `Permission`, `RolePermission` models; seeded defaults; created `src/lib/permissions.ts`, `src/lib/features.ts`, `src/hooks/useFeatureFlag.ts`, `src/lib/api-handler.ts`; added management API routes; added `requirePermission`.
- Phase 2 (Tenant Isolation): created `Tenant` model, applied migration `20260628130000_add_tenant_isolation` (backfill, NOT NULL, tenant-scoped unique constraints, missing FKs, composite indexes), added `src/lib/tenant-context.ts`, added tenantId to JWT payload, updated middleware/login/refresh/seed.
- Applied migrations `20260629120000_add_id_tenant_unique` (added `@@unique([id, tenantId])` to all tenant-scoped models) and `20260629130000_add_soft_delete_to_setting_auditlog` (added `isDeleted`/`deletedAt` to AppSetting and AuditLog).
- Rewrote `src/lib/prisma.ts` extension: smart injection of tenantId (fallback to default for filter queries/creates, skip for composite unique keys, inject only for id-only unique when explicit context exists).
- Refactored auth system from `requireAuth`/`requireRole`/`requirePermission` to `withAuth`/`withRole`/`withPermission` wrappers that use `AsyncLocalStorage.run()` instead of `enterWith()` to prevent cross-request context leaks.
- Updated all 42 API route files to use the new wrapper pattern.
- Fixed all TypeScript errors; `npx tsc --noEmit` passes cleanly.
- `npm run build` succeeds.
- All 28 existing Playwright e2e tests pass.
- **Fixed critical bug**: `withTenantData` was injecting `tenantId: DEFAULT_TENANT_ID` into all update/upsert data even without auth context (login route), corrupting every user's tenantId after login. Updated `withTenantUpdate`/`withTenantUpdateMany`/`withTenantUpsert` to never inject tenantId into update data – records must never change tenant.
- Created debug endpoint `/api/v1/debug/` that returns contextTenantId, jwtTenantId, dbUserTenantId, list of customers with their tenantIds, and `customersScopedByContext` boolean.
- **Fixed `globalForPrisma` caching bug**: In development, always create a fresh PrismaClient so HMR picks up extension changes. Without this, the cached extension closure never reflects updated function references. Production still uses the global cache.
- **Fixed PATCH `/api/v1/products/[id]/` handler**: Added `oldProduct` null check before the Prisma transaction. The extended `findUnique` correctly scopes by tenantId, so returning 404 when null prevents the PrismaClientKnownRequestError (P2025) from the `tx.product.update` call (which also runs through the extension in Prisma 6 transactions). Also hardened catch block to handle empty error messages.

### Done (Tenant Isolation)
- All 28 existing Playwright e2e tests pass.
- All 3 tenant isolation e2e tests (`e2e/tenant-isolation.spec.ts`) pass.

### Blocked
- Existing corrupted users in DB whose `tenantId` was overwritten to `DEFAULT_TENANT_ID` by the login bug still need to be fixed (restore correct tenantId via raw PrismaClient).
- Pre-existing drift between migration history and DB (`Customer` indexes, `JournalEntry.date` default, `WorkOrder.bookingId`); not fixed yet.
- Redis credentials missing in `.env`; rate limiter falls back to in-memory (noted for Phase 7).
- `.env.local` was deleted due to leaked Vercel OIDC token; external secrets (Neon DB password, Pollinations API key) still require manual rotation.

## Key Decisions
- Added `@@unique([id, tenantId])` to every tenant-scoped model so the extension can safely inject tenantId into id-based unique queries without conflicting with Prisma's strict `WhereUniqueInput` types.
- Extension falls back to `DEFAULT_TENANT_ID` for filter where (`findMany`/`findFirst`/`count`) and create data; for unique queries (`findUnique`/`update`/`delete`/`upsert`) only injects tenantId when an explicit context exists.
- Moved from `AsyncLocalStorage.enterWith()` to `run()` inside `withAuth`/`withRole`/`withPermission` to eliminate context leaking between concurrent requests.
- **Never inject tenantId into update/upsert data** – a record's tenant ownership boundary must be set at creation and never changed.
- `isDeleted` column added to `AppSetting` and `AuditLog` so the extension's `isDeleted: false` filter can be applied uniformly to all tenant-scoped models.
- Applied all Phase 2 migrations manually via `prisma db execute` + `prisma migrate resolve --applied` to avoid destructive reset.
- **Use fresh PrismaClient in development** to bypass the `globalForPrisma` caching pattern that prevents HMR from updating extension closure references.

## Next Steps
1. Fix existing corrupted users in DB whose `tenantId` was overwritten to `DEFAULT_TENANT_ID` by the login bug (restore correct tenantId via raw PrismaClient).
2. Clean up: remove debug endpoint `/api/v1/debug/`, remove retry logic in test's `login()`, remove test `console.log` in `tenant-isolation.spec.ts`.
3. Proceed to Phase 3 (Audit Logging, Inventory, CRM Timeline) once Phase 2 validates.

## Relevant Files
- `docs/ENTERPRISE_AUDIT_REPORT.md`: complete audit findings and phased plan.
- `prisma/schema.prisma`: now contains all tenant-scoped models with `@@unique([id, tenantId])`, `isDeleted`/`deletedAt` on all models including AppSetting and AuditLog.
- **`src/lib/prisma.ts`**: extended Prisma client with soft-delete and tenantId auto-injection. Uses fresh client in dev mode for HMR compatibility. Fixed `withTenantUpdate`/`withTenantUpdateMany`/`withTenantUpsert` to not inject tenantId into update data.
- `src/lib/tenant-context.ts`: AsyncLocalStorage tenant context + default tenant constant.
- `src/lib/auth.ts`: `withAuth`/`withRole`/`withPermission` wrappers using `AsyncLocalStorage.run()`, deprecated `requireAuth`/`requireRole`/`requirePermission`.
- All `src/app/api/` route files: refactored to use `withAuth`/`withRole`/`withPermission`.
- **`e2e/tenant-isolation.spec.ts`**: 3 tenant isolation E2E tests (all passing). Uses unique timestamped usernames and tenants per run to avoid cleanup collisions.
- **`src/app/api/v1/debug/route.ts`**: temporary debug endpoint (to be removed).
- **`src/app/api/v1/products/[id]/route.ts`**: PATCH handler fixed with `oldProduct` null check and hardened error handling.
- **Important: In Prisma 6, `$extends` DOES propagate to interactive transactions (`prisma.$transaction(async (tx) => { ... })`).* The `tx` object's methods include the extension's query interceptors, so `tx.product.update()` and other transaction methods also go through `withTenantUpdate`/`withTenantUniqueWhere`.
