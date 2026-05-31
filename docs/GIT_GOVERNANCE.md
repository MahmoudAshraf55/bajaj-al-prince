# Git Governance — BAJAJ AL PRINCE

## 1. Branch Strategy (Git Flow)

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready code | Protected — requires PR + review |
| `develop` | Integration branch for features | Protected — requires PR |
| `feature/*` | New functionality | Delete after merge |
| `hotfix/*` | Urgent production fixes | Merge to `main` + `develop` |
| `release/*` | Release preparation | Merge to `main`, tag, then delete |

### Naming Conventions

- `feature/inventory-system`
- `feature/customer-portal`
- `hotfix/security-patch`
- `release/v1.0.0`

---

## 2. Commit Convention (Conventional Commits)

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Use When | Example |
|------|----------|---------|
| `feat` | New feature | `feat(booking): add work order creation` |
| `fix` | Bug fix | `fix(auth): resolve token expiry edge case` |
| `chore` | Maintenance | `chore(deps): update prisma to 6.8` |
| `docs` | Documentation | `docs(api): add endpoint examples` |
| `refactor` | Code restructuring | `refactor(inventory): extract service layer` |
| `test` | Tests only | `test(e2e): add checkout flow spec` |
| `style` | Formatting only | `style(lint): fix trailing commas` |
| `perf` | Performance | `perf(query): add composite index` |
| `security` | Security fix | `security(auth): rotate jwt secret` |

### Scopes (Project-Specific)

- `3d` — Three.js / GSAP motorcycle experience
- `auth` — Authentication & authorization
- `booking` — Service booking module
- `market` — Product marketplace
- `inventory` — Inventory management
- `admin` — Admin dashboard
- `api` — REST API routes
- `ui` — Components & styling
- `db` — Prisma schema / migrations
- `ci` — CI/CD & DevOps

---

## 3. Pull Request Standards

### Required Fields

- **Title**: Follows commit convention
- **Description**:
  - What changed
  - Why it changed
  - Testing performed
  - Screenshots (for UI changes)

### Checklist (Must Pass Before Merge)

- [ ] Build passes (`npm run build`)
- [ ] TypeScript strict mode passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Playwright e2e tests pass (`npx playwright test`)
- [ ] No secrets committed
- [ ] `.env.example` updated if new env vars added
- [ ] Migration created if schema changed
- [ ] Protected features verified (Hero 3D, auth, booking rules)

### Review Requirements

| Branch | Required Reviews | CI Must Pass |
|--------|-----------------|--------------|
| `main` | 1 senior review | Yes |
| `develop` | 1 peer review | Yes |
| `hotfix/*` | 1 review (expedited) | Yes |

---

## 4. Merge Rules

- **Squash and merge** for feature branches (clean history)
- **Rebase and merge** for hotfixes (linear history on main)
- **Merge commit** for release branches (preserves feature grouping)
- Delete source branch after merge

---

## 5. Protected Branch Rules (GitHub)

### `main`

- Require pull request review before merging
- Require status checks to pass (CI/CD)
- Require branches to be up to date
- Restrict push to maintainers only
- Require signed commits (recommended)

### `develop`

- Require pull request review before merging
- Require status checks to pass
- Allow force pushes: **No**

---

## 6. Pre-Commit Safety Process

Before every PR:

1. Run `git status` — verify no accidental secret files staged
2. Run `npm run build` — must exit 0
3. Run `npx tsc --noEmit` — must exit 0
4. Run `npm run lint` — must exit 0
5. Run `npx playwright test` — must pass
6. Verify `.env` is NOT staged (`git diff --cached --name-only | grep -E '\.env' && echo 'ERROR: .env staged!'`)

---

## 7. Secret Prevention

### Hooks (Recommended)

Install pre-commit with secret scanning:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

`.husky/pre-commit`:
```bash
#!/bin/sh
# Block .env and secret files
if git diff --cached --name-only | grep -qE '\.env($|\.)'; then
  echo "ERROR: .env file detected in staged changes. Remove before committing."
  exit 1
fi

npx lint-staged
```

---

## Enforcement

Violations of branch protection, commit conventions, or secret handling must be corrected before merge.
