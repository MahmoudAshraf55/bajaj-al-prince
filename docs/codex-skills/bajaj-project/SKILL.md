---
name: bajaj-project
description: Use when working on the Bajaj Ghabbour Next.js project, including admin, booking, marketplace, API routes, Prisma, security, performance, responsive UI, 3D Hero motorcycle behavior, audits, reviews, or implementation tasks in this repository.
---

# Bajaj Ghabbour Project

Load this skill before implementation, review, audit, refactor, optimization, testing, documentation, or UI/API/database work in the Bajaj Ghabbour repository.

## Required Reading

Read these project files first:

- `docs/SYSTEM_RULES.md`
- `docs/PROJECT_RULES.md`
- `docs/AGENTS.md`

Use `references/roles.md` when a task benefits from a specific expert stance such as frontend, backend, 3D web, security, database, DevOps, ERP, SaaS, enterprise architecture, or technical leadership.

## Core Workflow

1. Check whether the request touches protected features, especially the Hero 3D Motorcycle experience.
2. Inspect the existing implementation before deciding on changes.
3. Keep edits scoped to the requested feature and local patterns.
4. Preserve security rules for authentication, authorization, validation, XSS prevention, CSRF, and secrets.
5. Preserve performance rules for GSAP cleanup, R3F rendering, Prisma singleton usage, and event cleanup.
6. Validate with TypeScript/build checks when feasible, then report any checks that could not run.

## Protected Hero 3D Rules

- Keep the GLB model centered at world origin.
- Move the camera, not the model group, for cinematic positioning.
- Use smooth parametric camera paths and always `lookAt(0, 0.3, 0)`.
- Never hard-toggle model visibility for fade behavior; use wrapper opacity.
- Use `gsap.context` and cleanup with `ctx.revert()`.

## Project Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- GSAP + ScrollTrigger
- Three.js + React Three Fiber + Drei
- Prisma
- SQLite/PostgreSQL
- JWT with `jose`
- Zod
- Lucide React

## Validation Commands

Run when feasible after code changes:

```bash
npx tsc --noEmit
npm run build
```

Also perform a brief security review covering auth, input validation, XSS, secret handling, and protected feature impact.
