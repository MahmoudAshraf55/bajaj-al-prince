# Bajaj Ghabbour — Project Engineering Rules

## 1. Project Architecture Overview

```
windsurf-project/
├── prisma/                 # Database schema & migrations
├── public/                 # Static assets (3D models, images)
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (site)/         # Public site layout + pages
│   │   ├── admin/          # Admin portal (login + dashboard)
│   │   ├── api/            # REST API routes
│   │   ├── booking/        # Booking page
│   │   ├── market/         # Product marketplace
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── 3d/             # Three.js / R3F components
│   │   ├── layout/         # Header, Footer
│   │   └── sections/       # Page sections (Hero, About, etc.)
│   ├── lib/                # Utilities (auth, prisma, utils)
│   └── types/              # Shared TypeScript types
├── docs/                   # Project documentation
└── Configuration files     # next.config, tsconfig, eslint, etc.
```

**Pattern:** Feature-based grouping with shared `lib/` and `types/` folders. Admin is a separate sub-route. API routes mirror frontend features.

---

## 2. Tech Stack Overview

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.6 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Animation | Framer Motion | 12.x |
| Scroll Animation | GSAP + ScrollTrigger | 3.x |
| 3D Rendering | Three.js + React Three Fiber + Drei | 0.184 / 9.6 |
| Database ORM | Prisma | 6.7 |
| Database | SQLite (dev) / PostgreSQL (prod) | — |
| Auth | JWT via jose + bcryptjs | 6.2 / 3.0 |
| Validation | Zod | 4.4 |
| Icons | Lucide React | 1.16 |

---

## 3. Protected Features

The following features are **STABLE** and must not be modified unless explicitly requested by the user:

### Hero 3D Motorcycle Experience
- **Initial centered motorcycle position** — Model at world origin, camera at front 3/4 view
- **Scroll-driven cinematic animation** — GSAP ScrollTrigger drives the entire experience
- **Motorcycle journey across sections** — Camera orbits 300° around the model as user scrolls
- **Continuous rotation behavior** — Both camera orbit and subtle model self-rotation
- **Smooth fade-out at final section** — Wrapper opacity transitions, never `model.visible = false`
- **Camera behavior** — Parametric circular orbit with `lookAt` locking
- **GSAP ScrollTrigger integration** — Single master trigger from `#overview` to `#design`
- **React Three Fiber implementation** — Imperative handles (`getCamera`, `getModel`, `setOpacity`)

### Preserved Visual Experience
- Hero typography layout (Bajaj Boxer 180 title, specs sidebar)
- Navigation inside Hero (Overview, Specs, Design)
- Editorial section structure (3 scroll sections)
- Glassmorphism card styling
- Dark theme color palette (#0a0a0a base, #c9a84c primary)

---

## 4. Hero 3D Motorcycle Rules

### Model Positioning Rule
- The GLB model **must** be centered at world origin: `group position={[0, y, 0]}`
- Only the camera moves; never offset the model group to fake positioning.

### Camera Animation Rule
- Use **parametric curves** (circular orbit) for camera path.
- Never use piecewise linear paths with kinks (discontinuities cause jerky motion).
- Always call `camera.lookAt(0, 0.3, 0)` after position updates.
- Always call `camera.updateProjectionMatrix()` after FOV changes.

### Fade Rule
- **Never** use `model.visible = false` or `model.visible = true`.
- Always use `sceneRef.current.setOpacity()` to animate the wrapper `<div>` opacity.
- Fade range: last 15–20% of scroll progress.

### Cleanup Rule
- All GSAP contexts must be created with `gsap.context(() => {...}, ref)`.
- All contexts must be reverted in the `useEffect` cleanup: `return () => ctx.revert()`.

---

## 5. Security Standards

### Authentication
- JWT tokens created with `jose` (HS256), 24h expiry.
- Tokens stored in `admin_token` HttpOnly cookie (Secure, SameSite=Strict).
- Token verification via cookie on every admin API call.

### Authorization
- Admin API routes **must** verify `admin_token` cookie via `requireAuth` / `requireRole`.
- Admin pages **must** gate access with token check + `/api/auth/me` validation.

### Input Validation
- All POST/PUT/PATCH bodies **must** pass Zod schema validation.
- Never pass raw request body directly to Prisma.

### Environment Variables
- `JWT_SECRET` and `DATABASE_URL` **must** be defined in `.env`.
- Never commit `.env` to version control.
- Never provide hardcoded fallbacks for secrets.

### XSS Prevention
- Text content rendered from database **must** be escaped or sanitized.
- Never use `dangerouslySetInnerHTML` with user input.

### CSRF Prevention
- State-changing API routes (POST, PATCH, DELETE) should require token auth.
- Contact/booking forms should include CSRF tokens or origin validation.

---

## 6. Responsive Standards

### Breakpoints
| Name | Width | Tailwind Prefix |
|---|---|---|
| Mobile S | 320px | — |
| Mobile M | 375px | — |
| Mobile L | 414px | — |
| Tablet S | 640px | `sm:` |
| Tablet M | 768px | `md:` |
| Tablet L | 1024px | `lg:` |
| Desktop | 1280px | `xl:` |
| Desktop L | 1440px | — |
| Desktop XL | 1920px | `2xl:` |

### Requirements
- No horizontal overflow (`overflow-x: hidden` on body).
- Navigation collapses to hamburger menu below `md:`.
- Grid layouts stack vertically on mobile.
- Text sizes scale: `text-6xl` → `sm:text-8xl` → `lg:text-9xl`.
- Touch targets minimum 44x44px.

---

## 7. Browser Compatibility Standards

| Browser | Minimum Version | Notes |
|---|---|---|
| Chrome | Latest - 2 | Primary target |
| Edge | Latest - 2 | Chromium-based |
| Firefox | Latest - 2 | Gecko engine |
| Safari | 16+ | WebKit; verify 3D canvas performance |

### Known Constraints
- Safari: `backdrop-filter` requires `-webkit-` prefix (handled by Tailwind).
- Safari: Contact shadows in R3F may have lower quality; acceptable.
- Firefox: `toneMapping: ACESFilmicToneMapping` supported in recent versions.

---

## 8. Performance Standards

### Rendering
- Use `dynamic()` with `ssr: false` for 3D scene to prevent SSR/hydration issues.
- Use `useInView({ once: true })` for Framer Motion sections to prevent re-animations.
- Avoid state updates in `useFrame` loops.

### GSAP
- Create one `ScrollTrigger` per scroll experience, not per section.
- Use `scrub: 1` for smooth scroll-linked animations.
- Revert all contexts on unmount.

### 3D
- Set `dpr={[1, 2]}` on Canvas to cap pixel ratio.
- Use `ContactShadows` with conservative `blur` and `far` values.
- Preload GLB models with `useGLTF.preload()`.

### Memory
- Prisma client is singleton via global cache.
- No event listeners added without cleanup.
- No `setInterval` without cleanup.

---

## 9. Coding Standards

### TypeScript
- Strict mode enabled.
- No `any` types in new code. Refactor existing `any` usages.
- Use explicit return types on exported functions.

### Imports
- Absolute imports via `@/` path alias.
- Group imports: React → Next → Libraries → Components → Utils.
- No unused imports (enforced by ESLint).

### Components
- Prefer Server Components unless client interactivity is required.
- Use `'use client'` only when necessary (hooks, browser APIs, event handlers).
- Component names must match file names.

### Naming
- PascalCase for components and types.
- camelCase for variables, functions, instances.
- kebab-case for file names (except components: PascalCase).

---

## 10. Validation Process

Before marking any task complete, run ALL of the following:

1. **TypeScript validation** — `npx tsc --noEmit`
2. **Build validation** — `npm run build` (must exit 0)
3. **Security review** — Check auth, input validation, XSS risks, secret handling
4. **Responsive review** — Check breakpoints: 320, 375, 390, 414, 768, 820, 1024, 1280, 1440, 1920
5. **Feature regression review** — Verify Hero 3D, forms, booking, market, admin
6. **Protected 3D animation review** — Verify centered model, smooth orbit, no hard-cut fade

---

## 11. Reporting Format

Every task completion report must include:

1. **Root cause analysis** — Why was the change needed?
2. **Implementation plan** — What approach was taken?
3. **Files modified** — Exact file paths and line ranges
4. **Security impact** — Did this change affect auth, validation, or data safety?
5. **Responsive impact** — Did this change affect mobile/tablet/desktop layouts?
6. **Performance impact** — Did this change affect bundle size, render performance, or memory?
7. **Protected feature verification** — Did this change touch the Hero 3D experience?
8. **Build results** — Build output summary
9. **Validation results** — Checklist of all validations run

---

## 12. Regression Prevention Rules

### Before Changing Code
- Search for all usages of the symbol/function being modified.
- Identify upstream callers and downstream consumers.
- Consider state management implications.

### During Implementation
- Make the minimal change necessary.
- Prefer single-responsibility edits.
- Do not refactor "while you're there" unless requested.

### After Implementation
- Run full build before declaring success.
- Verify all affected pages still render correctly.
- Check console for warnings/errors.
- Verify protected features remain intact.

---

## Enforcement

These rules are **non-negotiable**. Violations must be corrected before task completion.
# ENTERPRISE ARCHITECTURE ENFORCEMENT

Before any feature implementation the AI Agent MUST:

1. Identify the business domain affected.
2. Perform impact analysis.
3. Check database implications.
4. Check security implications.
5. Check scalability implications.
6. Check SEO implications.
7. Check accessibility implications.
8. Check mobile responsiveness implications.
9. Check backward compatibility.
10. Verify no protected features are affected.

No implementation is allowed before this analysis is completed.

Every new feature must:
- Follow SOLID principles.
- Follow DRY principles.
- Follow Clean Architecture principles.
- Include TypeScript types.
- Include Zod validation.
- Include error handling.
- Include loading states.
- Include empty states.
- Include responsive behavior.
- Include accessibility support.
- Include documentation updates.