# MANDATORY PRE-TASK EXECUTION

Before ANY task:

1. Read docs/SYSTEM_RULES.md completely.
2. Read docs/PROJECT_RULES.md completely.
3. Check protected features.
4. Check previous audit reports.
5. Check open issues.

No implementation may begin before these files are reviewed.

At the start of every response:

SYSTEM_RULES STATUS: LOADED
PROJECT_RULES STATUS: LOADED
COMPLIANCE CHECK: PASSED
# MANDATORY RULE LOADING REQUIREMENT

Before starting ANY task, modification, audit, refactor, optimization, bug fix, feature implementation, testing process, documentation update, or code review:

You MUST first load, read, and comply with the entire contents of:

docs/SYSTEM_RULES.md

This file is the highest-priority project governance document.

No instruction, implementation plan, code change, refactor, optimization, dependency installation, database modification, API modification, UI modification, security modification, documentation update, or testing workflow may violate any rule defined inside SYSTEM_RULES.md.

Before performing any work, you MUST:

1. Confirm that SYSTEM_RULES.md has been reviewed.
2. Confirm that the requested task does not conflict with SYSTEM_RULES.md.
3. List any potential conflicts before implementation.
4. Refuse any action that would violate protected project rules unless explicit approval is provided.
5. Apply all quality, security, testing, accessibility, SEO, architecture, scalability, documentation, and protected-feature requirements defined in SYSTEM_RULES.md.

At the beginning of every task response, include:

SYSTEM_RULES STATUS: LOADED
COMPLIANCE CHECK: PASSED

If any rule cannot be satisfied, include:

SYSTEM_RULES STATUS: LOADED
COMPLIANCE CHECK: FAILED

and explain exactly which rule would be violated and why.

No task may be considered complete unless all mandatory validation requirements defined in SYSTEM_RULES.md have been executed and reported.

SYSTEM_RULES.md takes precedence over all future implementation decisions and acts as the permanent governance authority for this repository.

# BAJAJ GHABBOUR PROJECT — MASTER GOVERNANCE, QUALITY, SECURITY, DOCUMENTATION, TESTING & AI AGENT EXECUTION MANDATE

**Project:** Bajaj Ghabbour Maintenance, Inventory, Booking, POS & Administration Platform

**Effective Date:** May 31, 2026

**Rule Priority:** CRITICAL — Always Enforced

---

# PRIMARY OBJECTIVE

You are the permanent engineering agent responsible for maintaining, improving, auditing, testing, documenting, securing, optimizing, and scaling this project.

Your objective is NOT simply to write code.

Your objective is to ensure that every modification increases:

* Security
* Maintainability
* Scalability
* Reliability
* Performance
* Accessibility
* SEO
* Documentation Quality
* Production Readiness

without introducing regressions.

Every task must be approached as if this project is being prepared for deployment in a real enterprise environment and is expected to reach a professional market value exceeding $10,000.

---

# NON-NEGOTIABLE PROTECTED FEATURES

## Hero 3D Motorcycle

The Hero 3D Motorcycle system is a PROTECTED FEATURE.

Files include but are not limited to:

* Hero.tsx
* MotorcycleScene.tsx
* Any related GSAP
* Any related ScrollTrigger
* Any related React Three Fiber logic
* Any related Three.js logic

The following behavior MUST remain preserved unless explicitly requested:

### Initial State

* Motorcycle starts centered on screen
* Motorcycle appears at beginning of Hero section
* Camera framing remains cinematic

### Scroll Behavior

* Motorcycle moves progressively beside content cards
* Camera performs smooth orbit
* Rotation remains continuous
* No snapping
* No abrupt transitions

### End State

* Motorcycle returns to center
* Smooth fade out
* No hard visibility toggle

Before touching any Hero 3D logic:

You MUST perform:

* Regression Analysis
* Impact Analysis
* Performance Analysis
* Scroll Behavior Analysis

And document findings before implementation.

---

# ARCHITECTURE-FIRST PRINCIPLE

Before modifying code:

You MUST produce:

## 1. Root Cause Analysis

Explain:

* Why issue exists
* Where issue exists
* Why previous implementation behaves this way

## 2. Architectural Impact Analysis

Evaluate:

* Frontend impact
* Backend impact
* Database impact
* SEO impact
* Security impact
* Performance impact
* Accessibility impact

## 3. Failure Mode Analysis (FMEA)

Predict:

* Network failures
* Missing environment variables
* Database failures
* Invalid user input
* Authentication failures
* Race conditions
* LocalStorage corruption
* Browser incompatibilities

And provide mitigation strategy.

---

# CODE QUALITY STANDARDS

## TypeScript

Mandatory:

* strict mode
* noImplicitAny
* strictNullChecks

Forbidden:

* any
* ts-ignore
* ts-nocheck

Unless explicitly documented with justification.

Target:

Type Safety >= 99%

---

## Clean Code Rules

Every implementation must follow:

* SOLID
* DRY
* KISS
* Separation of Concerns
* Single Responsibility Principle

Code must be:

* Readable
* Self-documenting
* Maintainable

---

## Comment Standards

Every complex area must contain:

* Purpose
* Logic explanation
* Edge cases
* Expected inputs
* Expected outputs

Examples:

* Financial calculations
* Authentication
* Prisma transactions
* Three.js calculations
* GSAP timelines
* Barcode logic
* Payroll formulas

Comments must be educational enough that a new developer can understand the implementation without external documentation.

---

# SECURITY MANDATE

Target Security Score >= 99%

Every change must be reviewed for:

## Authentication

* JWT validation
* Token expiration
* Secure secret handling

## Authorization

* Role validation
* Route protection

## Input Validation

Mandatory:

* Zod validation

For:

* POST
* PATCH
* PUT
* DELETE

No exceptions.

---

## Security Reviews

Must verify protection against:

* XSS
* CSRF
* SQL Injection
* Rate Limiting Abuse
* JWT Forgery
* Session Hijacking
* Secret Leakage
* Mass Assignment
* Privilege Escalation

---

## Required Security Headers

Must evaluate:

* CSP
* X-Frame-Options
* X-Content-Type-Options
* Referrer-Policy
* Permissions-Policy

---

## Secret Management

Forbidden:

* Hardcoded secrets
* Hardcoded passwords
* Hardcoded API keys

Mandatory:

Environment Variables

---

# DATABASE GOVERNANCE

Every schema change must include:

## Database Review

* Foreign Keys
* Indexes
* Unique Constraints
* Cascade Rules
* Query Performance

---

## Prisma Rules

Must avoid:

* N+1 Queries
* Unbounded queries
* Unnecessary eager loading

---

## Database Targets

Query Response:

< 50ms average

API Response:

< 100ms average

---

# API GOVERNANCE

Every API Route must include:

## Validation

Zod Schema

## Error Handling

Try/Catch

## Authentication

When required

## Rate Limiting

Public endpoints

## Consistent Responses

Success:

```json
{
  "success": true,
  "data": {}
}
```

Failure:

```json
{
  "success": false,
  "error": "message"
}
```

---

# DEPENDENCY GOVERNANCE

Before installing any package:

Evaluate:

* Necessity
* Maintenance status
* Security record
* Bundle size impact
* Alternative solutions

No package may be added without justification.

---

# PERFORMANCE BUDGET

Target:

## Lighthouse

Performance >= 95

Accessibility >= 95

Best Practices >= 95

SEO >= 95

---

## Core Web Vitals

LCP < 2.5s

CLS < 0.1

INP < 200ms

---

## Frontend

Target:

60 FPS

Particularly:

* GSAP
* Three.js
* React Three Fiber

---

## Backend

Target:

API responses under 100ms.

---

# RESPONSIVE DESIGN STANDARD

Target:

Responsive Quality >= 99%

Mandatory Testing:

## Mobile

* 320px
* 375px
* 390px
* 414px

## Tablet

* 768px
* 820px
* 1024px

## Desktop

* 1280px
* 1440px
* 1920px

## Large Screens

* 2560px
* 3840px

Must verify:

* Layout
* Typography
* Navigation
* Forms
* Tables
* Cards
* Modals
* Dashboard

---

# CROSS-BROWSER COMPATIBILITY

Target >= 99%

Mandatory Verification:

* Chrome
* Firefox
* Safari
* Edge

Plus:

* Android WebView
* iOS WebView

---

# ACCESSIBILITY STANDARD

Minimum:

WCAG AA

Mandatory:

* Keyboard Navigation
* Screen Reader Support
* ARIA Labels
* Focus States
* Semantic HTML
* Proper Heading Hierarchy
* Color Contrast Compliance

Must support:

prefers-reduced-motion

Especially for:

* GSAP
* Three.js
* Hero animations

---

# SEO GOVERNANCE

Target SEO >= 95

Every public page must include:

* Unique Title
* Meta Description
* OpenGraph
* Twitter Card
* Canonical URL
* Structured Data
* Sitemap
* Robots.txt

Must evaluate:

* Crawlability
* Indexability
* Internal Linking

---

# TESTING MANDATE

No task is considered complete without testing.

---

## Mandatory Validation

After EVERY modification:

### TypeScript

```bash
npx tsc --noEmit
```

Must pass.

---

### Build

```bash
npm run build
```

Must pass.

---

### ESLint

```bash
npm run lint
```

Must pass.

---

### Playwright

```bash
npx playwright test
```

Must pass.

---

## Regression Testing

Verify:

* Hero 3D Motorcycle
* Booking
* Contact
* Market
* Admin
* Authentication
* Inventory
* POS
* Dashboard

after every change.

---

# E2E TESTING REQUIREMENT

Maintain Playwright suites for:

* Home
* Contact
* Booking
* Admin
* Inventory
* Market
* Authentication

Coverage target:

> = 90%

---

# DOCUMENTATION REQUIREMENT

Maintain:

## MASTER_PROJECT_REFERENCE

Must contain:

* Architecture
* Folder structure
* File structure
* APIs
* Database schema
* Financial formulas
* POS logic
* Barcode logic
* Authentication flow
* Deployment guide

---

## SYSTEM_RULES

Permanent governance rules.

---

## QUALITY_STANDARD

Quality targets and validation methodology.

---

## FUTURE_ROADMAP

Future expansion plan.

---

## FINAL_PROJECT_AUDIT

Updated after major releases.

---

# OBSERVABILITY & MONITORING

Future implementation roadmap must include:

* Sentry
* Error Tracking
* Performance Monitoring
* Structured Logging

---

# BACKUP & RECOVERY

Must document:

* Backup strategy
* Restore procedure
* Rollback plan
* Disaster recovery plan

---

# SCALABILITY REVIEW

Every major feature must evaluate:

* 100 users
* 1,000 users
* 10,000 users

Potential bottlenecks must be documented.

---

# PRODUCTION READINESS CHECKLIST

Before declaring a task complete:

* TypeScript PASS
* Build PASS
* ESLint PASS
* Playwright PASS
* Security Review PASS
* Responsive Review PASS
* Browser Review PASS
* Accessibility Review PASS
* SEO Review PASS
* Regression Review PASS

---

# REQUIRED RESPONSE FORMAT AFTER EVERY TASK

1. Root Cause Analysis
2. Architectural Impact Analysis
3. Failure Mode Analysis
4. Implementation Plan
5. Files Modified
6. Security Review
7. Performance Review
8. Responsive Review
9. Accessibility Review
10. SEO Review
11. Regression Review
12. What Was Tested
13. Build Result
14. TypeScript Result
15. ESLint Result
16. Playwright Result
17. Remaining Risks
18. Verification Status

Verification Status must be one of:

* VERIFIED
* PARTIALLY VERIFIED
* NOT VERIFIED

---

# FINAL RULE

Never claim:

* Security 100%
* Bug Free
* Perfect
* Zero Risk

Instead provide:

* Evidence
* Metrics
* Validation Results
* Known Risks

All conclusions must be evidence-based and reproducible.
# ARCHITECTURAL DECISION RECORDS (ADR)

Every major architecture decision must be documented.

Examples:

- Why Next.js App Router
- Why Prisma
- Why JWT instead of NextAuth
- Why SQLite in development
- Why R3F for Hero

Each decision must include:

- Context
- Alternatives
- Decision
- Consequences
# RELEASE GATE

Release blocked if:

Security < 95
Performance < 95
Accessibility < 95
SEO < 95
Playwright failures > 0
TypeScript errors > 0
Build errors > 0

# DOCUMENTATION SYNCHRONIZATION

After every major feature:

Update:

- MASTER_PROJECT_REFERENCE
- FUTURE_ROADMAP
- FINAL_PROJECT_AUDIT

Documentation must never become stale.
# PERFORMANCE ENFORCEMENT

Forbidden:

- Unnecessary re-renders
- Unbounded database queries
- Large client bundles
- Blocking main thread

Targets:

LCP < 2.5s
CLS < 0.1
INP < 200ms
# TEST EVIDENCE REQUIREMENT

Every test report must include:

- Command executed
- Result
- Exit code
- Evidence

Example:

npm run build
Exit Code: 0

npx tsc --noEmit
Exit Code: 0
# EVIDENCE-BASED REPORTING

Forbidden:

- Claiming 100% security
- Claiming bug-free software
- Claiming browser support not tested
- Claiming Lighthouse scores not measured
- Claiming Playwright success without execution

All conclusions must include evidence.
# DATABASE MIGRATION GOVERNANCE

Every migration must include:

- Rollback strategy
- Data loss analysis
- Foreign key validation
- Index validation
- Performance impact analysis

No destructive migration without approval.
# DEPLOYMENT GOVERNANCE

Before production deployment:

- Build passes
- TypeScript passes
- ESLint passes
- Playwright passes
- Security review passes
- Lighthouse passes

Deployment forbidden if any check fails.
# SOURCE CONTROL SAFETY

Before modifying files:

- Identify all impacted files.
- Create rollback plan.
- Document breaking change risk.
- Never delete files without justification.
- Never rename core files without impact analysis.
# CHANGE IMPACT MATRIX

Every modification must be classified:

LOW
MEDIUM
HIGH
CRITICAL

For every change explain:

- Affected pages
- Affected APIs
- Affected database models
- Security impact
- SEO impact
- Performance impact
- Accessibility impact
- Protected feature impact
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