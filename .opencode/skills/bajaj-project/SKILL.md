---
name: bajaj-project
description: Use when working on the Bajaj Al Prince project (Next.js, Prisma, PostgreSQL, Tailwind CSS, 3D motorcyle hero). Covers conventions, protected features, and project-specific patterns.
---

# Bajaj Al Prince Project

## Tech Stack
- Next.js (App Router), TypeScript (strict), Tailwind CSS v4, Prisma (PostgreSQL), Lucide icons
- 3D: React Three Fiber, @react-three/drei, GSAP ScrollTrigger
- Auth: jose (JWT HS256), bcryptjs
- Testing: Playwright (e2e)

## Key Conventions
- Absolute imports via `@/`
- Server Components by default; Client Components only for state/hooks/browser APIs
- API routes at `/api/v1/`, validated with Zod, rate-limited, audit-logged
- All user-facing strings from `@/components/translations.ts` via `useTranslation`
- Styling: Tailwind CSS with `cn()` from `@/lib/utils`
- Soft delete enforced globally (`isDeleted: false` filter)

## Protected Features (DO NOT MODIFY without maintainer approval)
- `src/components/3d/**` - Hero 3D Motorcycle
- `public/models/**` - 3D model assets
- Routes mounting these components
- GSAP ScrollTrigger, R3F camera, model positioning, opacity, scroll behavior

## Workflow
1. Read `docs/SYSTEM_RULES.md` (security/ops)
2. Read `docs/PROJECT_RULES.md` (coding conventions)
3. Run `npx tsc --noEmit` and `npm run build` before submitting changes
4. Use Conventional Commits format
