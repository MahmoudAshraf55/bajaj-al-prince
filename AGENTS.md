# Bajaj Ghabbour Project Rules

Before working in this repository, read and follow:

- `docs/SYSTEM_RULES.md`
- `docs/PROJECT_RULES.md`
- `docs/AGENTS.md`

Use docs/SYSTEM_RULES.md for security, CI, and operational controls. Use docs/PROJECT_RULES.md for coding conventions, accessibility, performance, and implementation patterns. Use docs/AGENTS.md for agent workflows and approval guardrails. If the files conflict, follow docs/PROJECT_RULES.md unless an explicit override exists in docs/SYSTEM_RULES.md.

## Protected Feature Guardrails

- Treat the Hero 3D Motorcycle experience as protected. Protected scope includes files under src/components/hero/**, src/three/heroScene.tsx, related model assets in public/models/hero/**, and any routes that mount these components. Do not modify files in these paths without explicit approval.
- Do not change Hero, GSAP ScrollTrigger, React Three Fiber, camera, model positioning, opacity, or scroll behavior unless the repository owner or an approved maintainer explicitly requests it in an issue or PR comment that references the change. If the requester is not an approved maintainer, refuse the change and respond with: "Protected feature change denied: request must come from an approved maintainer. To proceed, open an issue and get an approver's confirmation."
- When a protected feature change is requested, require an issue or PR from the repository owner or a maintainer with the label allow-protected-change, and attach a testing report (visual diffs, perf metrics) before merging.
- Before touching protected 3D behavior, run: (1) visual regression tests using the project's visual regression tool for hero routes; (2) unit/e2e tests with `npm run test`; (3) performance profiling measuring FPS and main-thread frame times; (4) verify scroll behavior matches baseline with no >5px layout shift. Include a short report with results and CI artifacts.
- Follow this process for protected changes: (1) confirm explicit request from an approved requester with issue/PR citation; (2) create a branch and run baseline tests; (3) perform regression and performance testing; (4) submit changes with report and artifacts for review.

## Engineering Defaults

- Follow project patterns in docs/PROJECT_RULES.md and the reference implementations under src/examples/. Use the package.json versions for Next.js App Router, TypeScript, Tailwind CSS, Prisma, Zod, jose, bcryptjs, GSAP, Framer Motion, Three.js/R3F, and Lucide. If no example exists, create one and document it in a short RFC.
- Prefer Server Components. Use Client Components only when you need React state hooks (useState/useReducer), lifecycle hooks (useEffect/useLayoutEffect), access to window/document, browser-only APIs, or client-only libraries like Framer Motion or R3F. Document the decision in the PR.
- Use absolute imports via `@/`.
- Avoid new `any`, `ts-ignore`, or `ts-nocheck` unless approved in a PR with justification.
- Always validate request bodies with Zod in the server API route or middleware before calling Prisma. Keep Zod schemas under src/schemas/ and reuse them for client-side validation where applicable.
- Verify admin API routes with `requireAuth` or `requireRole`.
- Never hardcode secrets or commit `.env`.

## Validation

For implementation tasks, run the relevant checks when feasible:

- `npx tsc --noEmit`
- `npm run build`
- Security review for auth, validation, XSS, secret handling, and protected feature impact

If checks fail due to environment or dependency mismatches, include the error output, local Node/npm versions, OS, exact commands attempted, and CI logs if available. If a check cannot be run, report: (1) which check failed to run; (2) exact command and error output; (3) environment (OS, Node/npm versions); (4) steps attempted to fix; (5) a recommended next action.
