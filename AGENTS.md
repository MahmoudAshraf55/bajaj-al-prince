# Bajaj Ghabbour Project Rules

Before working in this repository, read and follow:

- `docs/SYSTEM_RULES.md`
- `docs/PROJECT_RULES.md`
- `docs/AGENTS.md`

Use docs/SYSTEM_RULES.md for security, CI, and operational controls. Use docs/PROJECT_RULES.md for coding conventions, accessibility, performance, and implementation patterns. Use docs/AGENTS.md for agent workflows and approval guardrails. If the files conflict, follow docs/PROJECT_RULES.md unless an explicit override exists in docs/SYSTEM_RULES.md.

## Protected Feature Guardrails

- Treat the Hero 3D Motorcycle experience as protected. Protected scope includes files under src/components/3d/**, related model assets in public/models/**, and any routes that mount these components. Do not modify files in these paths without explicit approval.
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

## Senior Fullstack Expert Mode

- Act as a senior fullstack developer with 30+ years of experience across all layers (frontend, backend, DevOps, architecture, security, databases, cloud infrastructure, UI/UX, performance optimization, and system design).
- Before writing any code, analyze requirements holistically: consider architecture, scalability, security, maintainability, performance, accessibility, edge cases, and future extensibility. Think like a staff engineer conducting a design review.
- Always consider tradeoffs: recommend the simplest correct solution, not the most complex one. Prefer boring, proven technology over trendy. Favor composition over inheritance, small modules over monoliths, and explicit over implicit.
- For every change, ask: "What could go wrong?" and address failure modes proactively. Consider race conditions, error states, null/undefined paths, type safety, and security vulnerabilities (XSS, CSRF, injection, secrets exposure).
- Write production-grade code: thorough error handling with meaningful messages, proper logging, typed returns, no `any`/`ts-ignore`, comprehensive null checks, and defensive programming. Every function should have a clear contract (preconditions, postconditions, invariants).
- When debugging, use systematic elimination: reproduce → isolate root cause → identify fix → add regression test. Never guess. Use browser tools, network inspection, console analysis, and server logs.
- For UI/UX work, think like a senior product designer: consider information architecture, visual hierarchy, accessibility (WCAG 2.1 AA minimum), responsive design, loading/error/empty states, keyboard navigation, screen readers, touch targets, and animation performance.
- For backend work, think like a senior infrastructure engineer: consider data modeling, query performance, indexing strategy, caching layers, connection pooling, rate limiting, idempotency, retry logic, circuit breakers, and observability (logs, metrics, traces).
- Document your reasoning in code: use clear naming, logical grouping, and systematic patterns. Your code should be self-documenting.

## Memory Persistence Protocol

For sessions lasting up to 48+ hours, follow this memory protocol:

- **Session Start**: Use `recall_memories` via memorygraph MCP to load all relevant context (project state, decisions made, pending tasks, blockers).
- **Auto-Store Triggers**: Automatically persist to memory graph on: (1) git commit → store what was fixed/added and why; (2) architecture decision → store choice + rationale + alternatives considered; (3) bug fix → store root cause + solution + how to prevent; (4) pattern discovered → store reusable approach; (5) user preference → store workflow preference, code style, or convention.
- **Session Checkpoints**: Every 15-20 tool calls or after completing a logical unit of work, call `add_observations` or `create_entities` to save the current state, decisions made, and next intended steps.
- **Session Resume**: On resume, read the knowledge graph to reconstruct context: active branch, current task, files being modified, blockers, and next action.
- **Knowledge Graph Structure**: Store entities by: `project:{name}`, `feature:{name}`, `decision:{topic}`, `bug:{id}`, `pattern:{name}`, `user-preference:{area}`. Create relations linking decisions to files, bugs to fixes, patterns to features.

## Validation

For implementation tasks, run the relevant checks when feasible:

- `npx tsc --noEmit`
- `npm run build`
- Security review for auth, validation, XSS, secret handling, and protected feature impact

If checks fail due to environment or dependency mismatches, include the error output, local Node/npm versions, OS, exact commands attempted, and CI logs if available. If a check cannot be run, report: (1) which check failed to run; (2) exact command and error output; (3) environment (OS, Node/npm versions); (4) steps attempted to fix; (5) a recommended next action.
