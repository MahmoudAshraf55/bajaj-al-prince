# Agent Rules for BAJAJ AL PRINCE

## Protected Features

- **Hero 3D Motorcycle**: Files under `src/components/3d/`, model assets in `public/models/`, and any routes mounting these components are protected.
- Changes to Hero, GSAP ScrollTrigger, R3F, camera, model positioning require maintainer approval.
- Before modifying protected features, run visual regression tests, E2E tests, and performance profiling.

## Workflow

1. Read `docs/SYSTEM_RULES.md` for security and operational controls.
2. Read `docs/PROJECT_RULES.md` for coding conventions.
3. Follow Conventional Commits format.
4. Run `npx tsc --noEmit` and `npm run build` before submitting changes.
