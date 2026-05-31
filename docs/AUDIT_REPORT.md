# Bajaj Ghabbour — Complete Project Audit Report

**Auditor:** Senior Full Stack / Security / QA / Frontend Engineer  
**Date:** 2026-05-31  
**Scope:** Full codebase review — Architecture, Code Quality, TypeScript, Security, Auth, API Design, Prisma, Database, Performance, GSAP, R3F, Responsive, Browser, Accessibility, SEO, Maintainability, Scalability  

---

## Executive Summary

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Security | 4 | 3 | 2 | 1 | 10 |
| Code Quality | 0 | 1 | 3 | 4 | 8 |
| Architecture | 0 | 1 | 2 | 2 | 5 |
| Performance | 0 | 1 | 1 | 3 | 5 |
| Accessibility | 0 | 0 | 1 | 2 | 3 |
| SEO | 0 | 0 | 1 | 1 | 2 |
| **TOTAL** | **4** | **6** | **10** | **13** | **33** |

**Build Status:** PASS (`npm run build` exits 0, 14/14 pages, TypeScript clean)  
**Overall Assessment:** The project is functional and well-structured for its scope, but has **4 CRITICAL security vulnerabilities** that must be addressed before production deployment. The Hero 3D animation is stable and meets requirements. Admin API routes lack proper authorization guards, creating data exposure risks.

---

## CRITICAL Findings

### C1 — Hardcoded JWT Secret Fallback
- **Issue:** `src/lib/auth.ts:5` uses `process.env.JWT_SECRET || 'bajaj-ghabbour-super-secret-key-2026'`
- **Location:** `src/lib/auth.ts`
- **Impact:** If `JWT_SECRET` is missing, a predictable hardcoded secret is used. An attacker who knows the fallback can forge admin tokens and gain full access.
- **Recommended Fix:** Remove the fallback. Throw an error at startup if `JWT_SECRET` is undefined. Add `JWT_SECRET` to required environment validation.

### C2 — No Authorization on Admin GET Endpoints
- **Issue:** `/api/contact/`, `/api/bookings/`, `/api/products/`, `/api/cashier/` GET handlers do not verify the `Authorization` header. Anyone can fetch all data.
- **Location:** `src/app/api/contact/route.ts:30`, `src/app/api/bookings/route.ts:68`, `src/app/api/products/route.ts:4`, `src/app/api/cashier/route.ts:11`
- **Impact:** Complete data leakage — contact messages, bookings, transactions, and product data are exposed to unauthenticated users.
- **Recommended Fix:** Add a `requireAuth()` helper that validates the Bearer token before processing GET requests on all admin-facing routes.

### C3 — No Authorization on DELETE / PATCH Endpoints
- **Issue:** `/api/contact/[id]/route.ts` (DELETE) and `/api/bookings/[id]/route.ts` (PATCH), `/api/products/[id]/route.ts` (PATCH) do not verify auth tokens.
- **Location:** `src/app/api/contact/[id]/route.ts`, `src/app/api/bookings/[id]/route.ts`, `src/app/api/products/[id]/route.ts`
- **Impact:** Any client can delete contact messages, update booking statuses, or modify product stock without authentication.
- **Recommended Fix:** Wrap all state-changing routes with auth verification middleware or helper.

### C4 — Products POST / PATCH Lack Input Validation
- **Issue:** `POST /api/products` passes `body` directly to `prisma.product.create({ data: body })` without Zod validation. `PATCH` does the same.
- **Location:** `src/app/api/products/route.ts:16`, `src/app/api/products/[id]/route.ts:8`
- **Impact:** Malformed data, missing required fields, or type mismatches can cause database errors or data corruption. Potential for injection-like attacks via Prisma's `create` if crafted payloads bypass type safety.
- **Recommended Fix:** Add Zod schemas for Product creation and update, matching the Prisma model fields.

---

## HIGH Findings

### H1 — No Rate Limiting on Public API Endpoints
- **Issue:** Contact form POST, booking POST, and login POST have no rate limiting.
- **Location:** `src/app/api/contact/route.ts`, `src/app/api/bookings/route.ts`, `src/app/api/auth/login/route.ts`
- **Impact:** Contact form is vulnerable to spam. Booking endpoint is vulnerable to reservation exhaustion. Login is vulnerable to brute-force attacks.
- **Recommended Fix:** Implement IP-based rate limiting (e.g., with `lru-cache` or `rate-limiter-flexible`) on all public POST endpoints. Limit contact submissions to 5/hour per IP, login to 5/minute per IP.

### H2 — No Input Sanitization / Stored XSS Risk
- **Issue:** Contact `message` and booking `issue` fields are stored directly in the database and rendered in the admin dashboard without HTML escaping.
- **Location:** `src/app/api/contact/route.ts:17`, `src/app/api/bookings/route.ts:58`, `src/app/admin/dashboard/page.tsx:228`
- **Impact:** A user could submit `<script>alert('XSS')</script>` in a contact message. When an admin views it in the dashboard, the script executes in their context.
- **Recommended Fix:** Sanitize all text inputs before storage (e.g., using `DOMPurify` or simple HTML entity encoding). Alternatively, escape output in the admin dashboard when rendering message/issue text.

### H3 — Missing Error Logging
- **Issue:** Every API route catch block returns a generic 500 error but does not log the actual error anywhere.
- **Location:** All API routes (`src/app/api/*/route.ts`)
- **Impact:** Production debugging is impossible. Silent failures hide bugs and make incident response slow.
- **Recommended Fix:** Add a structured logging utility (Winston, Pino, or simple `console.error` with context). Log errors with stack traces, request paths, and timestamps. Never expose internal error details to the client.

### H4 — No Security Headers / CSP
- **Issue:** `next.config.ts` does not configure security headers.
- **Location:** `next.config.ts`
- **Impact:** No Content-Security-Policy means XSS payloads can execute inline scripts. No X-Frame-Options allows clickjacking. No HSTS means MITM downgrade attacks are possible.
- **Recommended Fix:** Add `headers()` config in `next.config.ts` with:
  - `Content-Security-Policy` (block inline scripts, restrict img-src)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`

### H5 — Unused / Dead Dependencies
- **Issue:** `jsonwebtoken` and `@types/jsonwebtoken` are installed but the project uses `jose`. `postprocessing` is installed but `@react-three/postprocessing` is the actual dependency used.
- **Location:** `package.json`
- **Impact:** Bloats bundle size, increases install time, may cause version conflicts.
- **Recommended Fix:** `npm uninstall jsonwebtoken @types/jsonwebtoken postprocessing`

### H6 — Admin Dashboard Client-Side Token Exposure Pattern
- **Issue:** Admin dashboard reads token from `localStorage` at module level (`const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null`). This pattern can cause hydration mismatches and is readable by any XSS payload.
- **Location:** `src/app/admin/dashboard/page.tsx:37`
- **Impact:** If an XSS payload runs on any page, it can read `admin_token` from localStorage and impersonate the admin.
- **Recommended Fix:** Move token access inside `useEffect`. Consider httpOnly cookie-based auth for production (though this requires backend session storage). At minimum, wrap localStorage access in try/catch and validate token server-side on every request.

---

## MEDIUM Findings

### M1 — No Environment Variable Validation
- **Issue:** The app starts even if `JWT_SECRET` or `DATABASE_URL` is missing.
- **Location:** `src/lib/auth.ts`, `src/lib/prisma.ts`
- **Impact:** Silent failures in production when env vars are misconfigured.
- **Recommended Fix:** Add a `validateEnv()` function that runs at startup and throws descriptive errors for missing required variables.

### M2 — No `any` Type Migration Plan
- **Issue:** `src/components/sections/Hero.tsx:32` uses `useRef<any>`. `src/lib/auth.ts:17` casts payload `as any`.
- **Location:** `src/components/sections/Hero.tsx`, `src/lib/auth.ts`
- **Impact:** Defeats TypeScript's type safety. May hide bugs during refactors.
- **Recommended Fix:** Replace `useRef<any>` with `useRef<SceneRef | null>`. Replace `as any` in `createToken` with a proper generic or typed payload interface.

### M3 — Missing Database Seed / Migration Scripts
- **Issue:** `package.json` has no `db:seed`, `db:migrate`, or `db:generate` scripts.
- **Location:** `package.json`
- **Impact:** New developers must manually run Prisma commands. No standardized seed data for testing.
- **Recommended Fix:** Add scripts:
  ```json
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts"
  ```

### M4 — No Sitemap or robots.txt
- **Issue:** No `sitemap.ts` or `robots.ts` in the App Router. No `robots.txt` in public.
- **Location:** `src/app/`, `public/`
- **Impact:** Search engines may not index public pages correctly. Admin routes might be crawled.
- **Recommended Fix:** Add `src/app/sitemap.ts` and `src/app/robots.ts` (Next.js 16 App Router supports these natively). Disallow `/admin/` in robots.

### M5 — No Password Complexity Validation
- **Issue:** Admin login accepts any password length via Zod `z.string().min(1)`. The default password `admin123` is weak.
- **Location:** `src/app/api/auth/login/route.ts:8`
- **Impact:** Weak passwords are vulnerable to brute force.
- **Recommended Fix:** Add password complexity requirements (min 8 chars, mix of uppercase, lowercase, number, symbol) to the login schema. Document password requirements.

### M6 — Contact Form No CSRF Protection
- **Issue:** Contact and booking forms submit to API without CSRF tokens.
- **Location:** `src/components/sections/Contact.tsx`, `src/app/booking/page.tsx`
- **Impact:** Cross-site request forgery — an attacker could trick a logged-in user (if sessions existed) into submitting forms. Lower severity since there's no session cookie auth, but good practice.
- **Recommended Fix:** Add origin header validation on POST routes. For future session-based auth, implement double-submit cookie CSRF tokens.

### M7 — No Error Boundary
- **Issue:** No `error.tsx` or `global-error.tsx` in the App Router.
- **Location:** `src/app/`
- **Impact:** React errors in production will show the default Next.js error page or crash the app.
- **Recommended Fix:** Add `src/app/error.tsx` for route-level error handling and `src/app/global-error.tsx` for global crashes.

### M8 — Missing `aria-label` on Icon-Only Buttons
- **Issue:** Admin dashboard has icon-only buttons (delete, accept, reject) without accessible labels.
- **Location:** `src/app/admin/dashboard/page.tsx`
- **Impact:** Screen readers cannot describe button function.
- **Recommended Fix:** Add `aria-label` attributes to all icon-only buttons.

### M9 — No `prefers-reduced-motion` Support
- **Issue:** GSAP scroll animations and Framer Motion animations run regardless of user preference.
- **Location:** `src/components/sections/Hero.tsx`, `src/components/sections/About.tsx`, etc.
- **Impact:** Users with vestibular disorders may experience discomfort.
- **Recommended Fix:** Check `window.matchMedia('(prefers-reduced-motion: reduce)')` and disable/simplify animations when true.

### M10 — Hardcoded Contact Information Duplicated
- **Issue:** Phone number `+20 123 456 789`, email `info@bajajghabbour.com`, and location `Cairo, Egypt` are hardcoded in multiple files.
- **Location:** `src/components/layout/Header.tsx`, `src/components/sections/Contact.tsx`, `src/components/layout/Footer.tsx`
- **Impact:** Changing contact info requires editing multiple files. Risk of inconsistency.
- **Recommended Fix:** Extract contact constants into `src/lib/constants.ts` or a site config object.

---

## LOW Findings

### L1 — Missing `.env.example`
- **Issue:** No `.env.example` file exists in the repository.
- **Location:** Root directory
- **Impact:** New developers don't know which environment variables are required.
- **Recommended Fix:** Create `.env.example` with placeholder values and comments.

### L2 — README Lacks Setup Instructions
- **Issue:** `README.md` is generic and does not explain how to install, configure, or run the project.
- **Location:** `README.md`
- **Impact:** Onboarding friction for new developers.
- **Recommended Fix:** Add setup steps: `npm install`, `cp .env.example .env`, `npx prisma migrate dev`, `npm run dev`, `npm run build`.

### L3 — No Analytics / Tracking
- **Issue:** No Google Analytics, Plausible, or any analytics integration.
- **Location:** `src/app/layout.tsx`
- **Impact:** No visibility into traffic, user behavior, or conversion funnels.
- **Recommended Fix:** Add a lightweight analytics script (e.g., Vercel Analytics, Plausible) to the root layout.

### L4 — Admin Dashboard No Loading Skeletons
- **Issue:** While data loads, the dashboard shows only a spinner. Content areas pop in abruptly.
- **Location:** `src/app/admin/dashboard/page.tsx:84`
- **Impact:** Poor perceived performance. Layout shift when data arrives.
- **Recommended Fix:** Add skeleton placeholders for stats cards, tables, and lists using `animate-pulse` divs.

### L5 — Footer Could Be Server Component
- **Issue:** `Footer.tsx` has no client-side interactivity but is imported into a layout that could benefit from server rendering.
- **Location:** `src/components/layout/Footer.tsx`
- **Impact:** Unnecessary client-side JavaScript. Minor bundle increase.
- **Recommended Fix:** Remove `'use client'` if not needed, or refactor to be a pure server component.

### L6 — Booking Page Regenerates Time Slots on Every Render
- **Issue:** `generateTimeSlots()` is called inside the component body and creates a new array every render.
- **Location:** `src/app/booking/page.tsx:14`
- **Impact:** Unnecessary object creation. Negligible at this scale but not ideal.
- **Recommended Fix:** Move `generateTimeSlots` outside the component or memoize with `useMemo`.

### L7 — Market Page Uses Static Mock Data
- **Issue:** `products` array is hardcoded in the component, not fetched from `/api/products/`.
- **Location:** `src/app/market/page.tsx:9`
- **Impact:** Market page does not reflect real inventory. Admin product changes don't appear on the site.
- **Recommended Fix:** Fetch products from `/api/products/` with `useEffect` or use Next.js data fetching (Server Component + `fetch()`).

### L8 — No `loading.tsx` or `not-found.tsx`
- **Issue:** App Router supports `loading.tsx` and `not-found.tsx` for better UX, but none are present.
- **Location:** `src/app/`
- **Impact:** Users see blank screens during slow loads and generic 404 pages.
- **Recommended Fix:** Add `src/app/loading.tsx` and `src/app/not-found.tsx`.

### L9 — Missing `revalidatePath` After Mutations
- **Issue:** Admin dashboard updates (booking status, stock, transactions) do not trigger Next.js cache revalidation.
- **Location:** `src/app/admin/dashboard/page.tsx`
- **Impact:** Server-rendered pages may show stale data after admin mutations.
- **Recommended Fix:** Call `revalidatePath('/market')` or `revalidateTag('products')` in API routes after mutations.

### L10 — Admin Dashboard Tab State Not URL-Synced
- **Issue:** Active tab is stored in React state only. Refreshing the page resets to "Overview".
- **Location:** `src/app/admin/dashboard/page.tsx:29`
- **Impact:** Poor UX when sharing links or refreshing.
- **Recommended Fix:** Sync tab state to URL query param (`?tab=bookings`) using `useSearchParams` + `router.replace`.

### L11 — No OpenGraph / Twitter Card Images
- **Issue:** Metadata in `layout.tsx` only has title and description. No OG image.
- **Location:** `src/app/layout.tsx`
- **Impact:** Social sharing shows bland link previews.
- **Recommended Fix:** Add `openGraph` and `twitter` metadata objects with image URLs.

### L12 — Booking `generateTimeSlots` Doesn't Respect Minutes
- **Issue:** `isValidTime` only checks the hour, but `generateTimeSlots` creates `:00` and `:30` slots. The API validation allows any minute value.
- **Location:** `src/app/api/bookings/route.ts:26`
- **Impact:** Inconsistent validation logic between frontend and backend.
- **Recommended Fix:** Align frontend and backend time validation logic.

### L13 — `jsonwebtoken` Types Package Still Present
- **Issue:** `@types/jsonwebtoken` is installed but the project uses `jose` exclusively.
- **Location:** `package.json`
- **Impact:** Unnecessary dependency.
- **Recommended Fix:** Remove with `npm uninstall @types/jsonwebtoken`.

---

## Architecture Assessment

### Strengths
- Clean separation: public site `(site)`, admin, API routes
- Prisma ORM with typed queries
- Zod validation on most API routes
- JWT auth with jose (modern, edge-compatible)
- Component-based section architecture
- Dynamic import for 3D scene (avoids SSR issues)

### Weaknesses
- No middleware for auth (repeated token checks in every route)
- No shared error handling utility
- No shared API response format/type
- No service layer between API routes and Prisma (thin controllers)
- Client-side admin auth only (no httpOnly cookies)

---

## Database Design Assessment

### Schema Review
| Model | Assessment |
|---|---|
| `ContactMessage` | Good — UUID PK, required fields, timestamps |
| `Booking` | Good — status enum as string, date/time stored as strings (appropriate for form data) |
| `Product` | Good — price as Float, stock as Int, available flag |
| `Transaction` | Good — type/amount/description |
| `User` | **Concern** — password stored as plain string after hashing? Actually `hashPassword` returns bcrypt hash. Good. But no `createdAt`/`updatedAt`. |

### Concerns
- `User` model lacks timestamps and email field.
- No indexes defined (minor at this scale, but `email` on `ContactMessage` and `username` on `User` should have indexes).
- `Booking.date` and `Booking.time` are strings — fine for display but querying date ranges is harder.

---

## Performance Assessment

### Strengths
- Prisma client singleton prevents connection leaks
- `dpr={[1, 2]}` caps pixel ratio on high-DPI screens
- `useInView({ once: true })` prevents repeated Framer Motion calculations
- Dynamic import for 3D scene keeps initial bundle light

### Weaknesses
- Admin dashboard fetches ALL data on mount (no pagination)
- No image optimization (all images are `unoptimized`)
- 3D Canvas is fixed and renders even when off-screen (though this is by design for the scroll effect)
- No `React.memo` on heavy list components (admin tables)

---

## Responsive Assessment

### Strengths
- Tailwind responsive prefixes used consistently
- Mobile navigation implemented (hamburger menu)
- Touch targets appear large enough
- Grid breakpoints: 1-col → 2-col → 3-col → 4-col

### Weaknesses
- 3D Canvas fixed overlay may interfere with touch scrolling on mobile (needs `touch-action` CSS)
- Admin sidebar is hidden on mobile but content may be cramped
- Hero text at 320px may be too large (`text-6xl` is 60px — might need `text-4xl` on smallest screens)

---

## Accessibility Assessment

### Strengths
- Semantic HTML structure (sections, nav, footer)
- `html lang="en"` set
- Form inputs have associated labels

### Weaknesses
- No `aria-label` on icon-only buttons (M8)
- No `prefers-reduced-motion` support (M9)
- No skip-to-content link
- No focus-visible styles beyond default
- Color contrast on `text-muted-foreground` (#a0a0a0) on `bg-secondary` (#1a1a1a) is 4.5:1 (passes WCAG AA for large text, marginal for small text)

---

## SEO Assessment

### Strengths
- Metadata set in root layout
- Title and description are present

### Weaknesses
- No OpenGraph images (L11)
- No sitemap (M4)
- No robots.txt (M4)
- No structured data (JSON-LD) for local business
- No canonical URLs

---

## Recommended Implementation Order

### Phase 1 — Security Hardening (CRITICAL)
1. **C1** — Remove JWT fallback, add env validation
2. **C2** — Add auth guards to all admin GET routes
3. **C3** — Add auth guards to all DELETE / PATCH routes
4. **C4** — Add Zod validation to Products POST/PATCH
5. **H1** — Implement rate limiting on public endpoints
6. **H2** — Sanitize user text inputs / escape output in admin
7. **H4** — Add security headers in `next.config.ts`

### Phase 2 — Reliability (HIGH)
8. **H3** — Add error logging utility
9. **M7** — Add error boundaries
10. **H6** — Secure token access pattern in admin dashboard
11. **M1** — Add environment variable validation

### Phase 3 — Quality of Life (MEDIUM)
12. **M2** — Remove `any` types from Hero and auth
13. **M3** — Add Prisma scripts to package.json
14. **M5** — Add password complexity validation
15. **M8** — Add aria-labels to icon buttons
16. **M9** — Add `prefers-reduced-motion` support
17. **M10** — Extract contact constants

### Phase 4 — Features & Polish (LOW)
18. **L7** — Connect market page to real API
19. **M4** — Add sitemap and robots
20. **L8** — Add loading.tsx and not-found.tsx
21. **L10** — Sync admin tabs to URL
22. **L11** — Add OpenGraph metadata
23. **L3** — Add analytics
24. **L4** — Add loading skeletons to admin
25. **L5** — Convert Footer to Server Component

---

## Sign-off

| Check | Status |
|---|---|
| Audit completed without code modifications | PASS |
| Findings categorized by severity | PASS |
| All files reviewed | PASS |
| Recommended fix order provided | PASS |
