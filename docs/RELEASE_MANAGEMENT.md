# Release Management — BAJAJ AL PRINCE

## 1. Release Environments

| Environment | Branch | Purpose | URL Pattern |
|-------------|--------|---------|-------------|
| **Local** | any feature/* | Developer testing | `http://localhost:3000` |
| **CI/CD** | PR branch | Automated validation | GitHub Actions |
| **Staging** | `develop` | Integration testing | `https://staging.bajajalprince.com` |
| **Production** | `main` | Live customers | `https://bajajalprince.com` |

---

## 2. Release Types

### Standard Release (Minor / Major)

```
1. Create release branch from develop
   git checkout -b release/v0.2.0 develop

2. Bump version in package.json
   npm version 0.2.0 --no-git-tag-version

3. Update CHANGELOG.md

4. Final QA on release branch
   npm run build
   npx tsc --noEmit
   npm run lint
   npx playwright test

5. Merge to main
   git checkout main
   git merge --no-ff release/v0.2.0

6. Tag release
   git tag -a v0.2.0 -m "Release v0.2.0 — Branding Upgrade"

7. Merge back to develop
   git checkout develop
   git merge main

8. Delete release branch
   git branch -d release/v0.2.0

9. Create GitHub Release with notes
```

### Hotfix Release (Patch)

```
1. Create hotfix branch from main
   git checkout -b hotfix/v0.1.1 main

2. Apply minimal fix

3. Bump patch version
   npm version 0.1.1 --no-git-tag-version

4. Test fix

5. Merge to main AND develop
   git checkout main && git merge --no-ff hotfix/v0.1.1
   git tag -a v0.1.1 -m "Hotfix v0.1.1"
   git checkout develop && git merge main

6. Delete hotfix branch
```

---

## 3. Release Checklist

### Pre-Release (Must Pass)

- [ ] All features for this version merged to `develop`
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes (strict mode)
- [ ] `npm run lint` passes (zero errors)
- [ ] `npx playwright test` passes
- [ ] `npm audit` — zero critical/high vulnerabilities
- [ ] No `.env` files staged
- [ ] `docs/CHANGELOG.md` updated
- [ ] `package.json` version bumped
- [ ] Database migration tested (if schema changed)
- [ ] Protected features verified (Hero 3D, auth, booking)
- [ ] Responsive test passed (320px–1920px)
- [ ] Security review completed

### Release Execution

- [ ] Release branch created
- [ ] Final QA sign-off
- [ ] Merged to `main`
- [ ] Git tag created
- [ ] GitHub Release published
- [ ] Staging deployment verified
- [ ] Production deployment scheduled
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

### Post-Release

- [ ] Smoke tests on production
- [ ] Error logs checked (first 1 hour)
- [ ] Analytics verified (traffic, conversions)
- [ ] Customer communication sent (if user-facing)
- [ ] Incident response team on standby (24h)

---

## 4. Rollback Procedures

### Code Rollback

```bash
# Identify last known good tag
git tag --list | sort -V | tail -5

# Rollback main to previous tag
git checkout main
git reset --hard v0.1.0
git push --force-with-lease origin main

# Or: revert specific commit
git revert <commit-hash>
```

### Database Rollback

```bash
# If migration failed — revert to last known good state
cp /backups/db/prod-pre-release.db /app/prisma/dev.db

# Or: use Prisma migration rollback
npx prisma migrate resolve --rolled-back "20250601120000_migration_name"
```

### Docker Rollback (if containerized)

```bash
docker pull ghcr.io/owner/bajaj-al-prince:v0.1.0
docker-compose up -d
```

---

## 5. Emergency Hotfix Workflow

1. **Alert** — Monitoring detects critical issue
2. **Assess** — Determine severity (P0 = immediate, P1 = same day)
3. **Branch** — `hotfix/critical-issue` from `main`
4. **Fix** — Minimal change, no refactoring
5. **Test** — CI/CD pipeline + manual verification
6. **Deploy** — Direct to production (bypass staging for P0)
7. **Verify** — Smoke tests + error log monitoring
8. **Communicate** — Status page update + customer notification
9. **Retro** — Post-incident review within 48 hours

---

## 6. Release Notes Template

```markdown
## v0.2.0 — BAJAJ AL PRINCE Branding Upgrade

**Released**: 2026-06-15
**Compare**: [v0.1.0...v0.2.0](https://github.com/owner/bajaj-al-prince/compare/v0.1.0...v0.2.0)

### What's New
- Feature A (#123)
- Feature B (#124)

### Improvements
- Performance: 30% faster page load (#125)

### Security
- No changes

### Breaking Changes
- None

### Migration
- None required

### Known Limitations
- IE11 not supported

### Technical Debt
- #126 — Refactor auth middleware
```

---

## 7. Deployment Windows

| Environment | Window | Approval |
|-------------|--------|----------|
| Staging | Any time | Auto-deploy from `develop` |
| Production | Tue–Thu, 10:00–14:00 UTC+3 | Technical Lead approval |
| Hotfix | Any time | Emergency protocol |

**No production deployments on:**
- Friday afternoons
- Weekends
- Public holidays in target market

---

## 8. Monitoring & Alerts

Post-deployment monitoring (first 24 hours):

- Error rate < 0.1%
- P95 response time < 500ms
- 5xx errors = immediate alert
- Auth failures spike = security alert
- Database connection errors = infrastructure alert
