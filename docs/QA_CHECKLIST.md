# Bajaj Ghabbour — QA Checklist

> This checklist must be completed before any deployment or before marking a task as complete.

---

## Build Validation

- [ ] `npm run build` executes successfully (Exit 0)
- [ ] TypeScript compilation passes with zero errors
- [ ] No ESLint errors (`npm run lint` or `npx eslint`)
- [ ] All static pages generate correctly (14/14)
- [ ] No console warnings during build
- [ ] No unhandled promise rejections in build log

---

## Security Validation

### Authentication
- [ ] Login endpoint returns 401 for invalid credentials
- [ ] Login endpoint returns 401 for non-existent users
- [ ] Token is generated with 24h expiry
- [ ] Token contains `userId`, `username`, `role` claims
- [ ] `JWT_SECRET` is defined in environment variables (no fallback)

### Authorization
- [ ] `/api/auth/me/` rejects requests without `Bearer` token
- [ ] `/api/auth/me/` rejects expired/invalid tokens
- [ ] Admin GET endpoints (`/api/contact/`, `/api/bookings/`, `/api/products/`, `/api/cashier/`) reject unauthenticated requests
- [ ] Admin DELETE/PATCH endpoints reject unauthenticated requests
- [ ] Admin dashboard redirects unauthenticated users to `/admin/`

### Input Validation
- [ ] Contact form POST validates `name` (2–100 chars)
- [ ] Contact form POST validates `phone` (5–30 chars)
- [ ] Contact form POST validates `email` (valid format)
- [ ] Contact form POST validates `message` (10–2000 chars)
- [ ] Booking form POST validates all fields via Zod schema
- [ ] Booking POST rejects Friday dates
- [ ] Booking POST rejects past dates
- [ ] Booking POST rejects times outside 10:00–22:00
- [ ] Booking POST rejects double-booked time slots
- [ ] Cashier POST validates `type` as `'income'` or `'expense'`
- [ ] Cashier POST validates `amount` as positive number
- [ ] Products POST validates all required fields
- [ ] Products PATCH validates update payload

### XSS / Injection
- [ ] No raw HTML rendered from database fields
- [ ] No `dangerouslySetInnerHTML` with user input
- [ ] Prisma queries use parameterized inputs (no raw SQL)

### Environment
- [ ] `.env` file exists locally
- [ ] `.env` is in `.gitignore`
- [ ] `DATABASE_URL` is defined
- [ ] `JWT_SECRET` is defined and is a strong random string (≥ 32 chars)

---

## Responsive Validation

### Mobile (Portrait)
- [ ] **320px** — No horizontal overflow, no clipped text, hamburger menu works
- [ ] **375px** — Hero title readable, cards stack vertically, forms usable
- [ ] **390px** — 3D canvas does not cause scroll issues
- [ ] **414px** — Navigation accessible, touch targets ≥ 44px

### Tablet
- [ ] **768px** — 2-column grids active, sidebar nav visible on admin
- [ ] **820px** — Market grid shows 2 columns
- [ ] **1024px** — Admin dashboard sidebar visible, tables readable

### Desktop
- [ ] **1280px** — Full layout renders, 3-column market grid
- [ ] **1440px** — Hero 3D model centered, text not overlapping
- [ ] **1920px** — Max-width containers prevent excessive stretching

### General
- [ ] No layout breaks at any tested breakpoint
- [ ] No hidden content or clipped elements
- [ ] Font sizes scale appropriately
- [ ] Images and icons maintain aspect ratios

---

## Browser Validation

| Browser | Version | Status |
|---|---|---|
| Chrome | Latest - 2 | ⬜ |
| Edge | Latest - 2 | ⬜ |
| Firefox | Latest - 2 | ⬜ |
| Safari | 16+ | ⬜ |

### Per-Browser Checks
- [ ] 3D model loads and animates on scroll
- [ ] Glassmorphism backdrop-filter renders correctly
- [ ] Forms submit without errors
- [ ] Navigation works (desktop + mobile)
- [ ] No console errors

---

## Feature Validation

### Hero 3D Animation
- [ ] Motorcycle visible immediately on page load
- [ ] Motorcycle is visually centered
- [ ] Scroll animation begins smoothly
- [ ] Camera orbits without jumps or snaps
- [ ] Model rotation is continuous and cinematic
- [ ] No hard-cut fade — opacity transition is smooth
- [ ] Model is fully invisible at end of scroll range
- [ ] No console warnings from Three.js or GSAP
- [ ] `ctx.revert()` cleanup confirmed in code

### Contact Form
- [ ] Form renders on `/` (home page, Contact section)
- [ ] All fields are required
- [ ] Success state displays after submission
- [ ] Error state displays on failure
- [ ] Message appears in admin dashboard after submission

### Booking Page
- [ ] Page renders at `/booking/`
- [ ] Date picker blocks past dates
- [ ] Friday dates are blocked
- [ ] Time slots generate correctly (10:00–22:00, every 30 min)
- [ ] Double booking is rejected
- [ ] Success state displays after submission
- [ ] Booking appears in admin dashboard

### Market Page
- [ ] Page renders at `/market/`
- [ ] Products display in grid
- [ ] Category filter works
- [ ] Search filter works
- [ ] "Out of Stock" badge displays correctly
- [ ] "Inquire" button visible on each product

### Admin Login
- [ ] Login page renders at `/admin/`
- [ ] Valid credentials redirect to `/admin/dashboard/`
- [ ] Invalid credentials show error message
- [ ] Token is stored in `localStorage`
- [ ] Authenticated user is redirected away from login page

### Admin Dashboard
- [ ] Dashboard renders at `/admin/dashboard/`
- [ ] Unauthenticated users are redirected
- [ ] Overview tab shows stats (messages, bookings, products, balance)
- [ ] Messages tab shows contact form submissions
- [ ] Messages can be deleted
- [ ] Bookings tab shows all bookings
- [ ] Bookings can be accepted/rejected
- [ ] Inventory tab shows products
- [ ] Stock can be incremented/decremented
- [ ] Cashier tab shows transactions
- [ ] Income/expense can be added
- [ ] Logout clears token and redirects

### API Routes
- [ ] `POST /api/auth/login` — returns token
- [ ] `GET /api/auth/me` — returns user payload
- [ ] `POST /api/contact` — creates message
- [ ] `GET /api/contact` — lists messages (auth required)
- [ ] `DELETE /api/contact/[id]` — deletes message (auth required)
- [ ] `POST /api/bookings` — creates booking
- [ ] `GET /api/bookings` — lists bookings (auth required)
- [ ] `PATCH /api/bookings/[id]` — updates status (auth required)
- [ ] `GET /api/products` — lists products
- [ ] `POST /api/products` — creates product (auth required)
- [ ] `PATCH /api/products/[id]` — updates stock (auth required)
- [ ] `GET /api/cashier` — lists transactions (auth required)
- [ ] `POST /api/cashier` — creates transaction (auth required)

### Authentication Flow
- [ ] Token persists across page reloads
- [ ] Token expiry is handled (user redirected to login)
- [ ] Logout removes token from `localStorage`

---

## Performance Validation

### React Rendering
- [ ] No unnecessary re-renders in admin dashboard (check with React DevTools Profiler)
- [ ] `useInView({ once: true })` used for scroll animations
- [ ] State updates are batched where possible

### Event Cleanup
- [ ] `window.addEventListener('scroll', ...)` has matching `removeEventListener`
- [ ] `useEffect` cleanups fire on unmount
- [ ] No orphaned event listeners after navigation

### GSAP Cleanup
- [ ] All `gsap.context()` calls have matching `ctx.revert()`
- [ ] No `ScrollTrigger` instances left after page change
- [ ] No timeline instances leaking

### Memory Leak Review
- [ ] `setInterval` / `setTimeout` have cleanup
- [ ] Large arrays/objects are not recreated on every render
- [ ] Prisma client is singleton (not re-instantiated)
- [ ] 3D scene disposes resources on unmount

### Bundle
- [ ] `three` and `@react-three/fiber` are dynamically imported where possible
- [ ] No unused dependencies in `package.json`
- [ ] No dead code imports

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Developer | | | |
| QA Engineer | | | |
| Security Reviewer | | | |
| Product Owner | | | |

> **Do not deploy if any checkbox is unchecked without documented justification.**
