# Versioning Strategy — BAJAJ AL PRINCE

## 1. Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH`

| Position | Increment When | Examples |
|----------|---------------|----------|
| **MAJOR** | Breaking changes, database redesign, architecture shift | `v0.x.x → v1.0.0` |
| **MINOR** | New features, new modules, new business functionality | `v0.1.0 → v0.2.0` |
| **PATCH** | Bug fixes, security patches, performance optimizations | `v0.1.0 → v0.1.1` |

---

## 2. Pre-Release & Build Metadata

| Suffix | Meaning | Example |
|--------|---------|---------|
| `-alpha` | Internal testing | `v1.0.0-alpha.1` |
| `-beta` | External beta testing | `v1.0.0-beta.2` |
| `-rc` | Release candidate | `v1.0.0-rc.1` |

---

## 3. Release Roadmap

| Version | Codename | Features | Target Date |
|---------|----------|----------|-------------|
| **v0.1.0** | *Prototype* | Public website, booking, market, admin auth, 3D hero | Current |
| **v0.2.0** | *Branding* | BAJAJ AL PRINCE rebrand, logo, color system, typography | TBD |
| **v0.3.0** | *Auth+Security* | RBAC, password reset, audit log, 2FA | TBD |
| **v0.4.0** | *Work Orders* | Service intake, mechanic assignment, job tracking, status flow | TBD |
| **v0.5.0** | *Inventory MVP* | Stock tracking, parts catalog, low-stock alerts, suppliers | TBD |
| **v0.6.0** | *Customer Portal* | Self-service booking, history, invoices, profile | TBD |
| **v0.7.0** | *POS* | In-person sales, receipt generation, cash/card/payment tracking | TBD |
| **v0.8.0** | *Cashier* | Daily close, shift management, cash drawer reconciliation | TBD |
| **v0.9.0** | *Employee Mgmt* | Profiles, roles, permissions, shift scheduling | TBD |
| **v0.10.0** | *Payroll* | Salary calculation, deductions, payslip generation | TBD |
| **v0.11.0** | *Attendance* | Clock-in/out, leave management, overtime tracking | TBD |
| **v0.12.0** | *Barcode* | SKU generation, barcode printing, scanner integration | TBD |
| **v0.13.0** | *Multi-Branch* | Branch creation, inter-branch transfer, consolidated reporting | TBD |
| **v0.14.0** | *Analytics* | Dashboards, KPIs, revenue reports, mechanic performance | TBD |
| **v1.0.0** | *Commercial* | Complete ERP platform, SLA, support, enterprise readiness | TBD |

---

## 4. Versioning Rules

### Package.json Sync

`package.json` version must match the Git tag:

```bash
# Before tagging
npm version 0.2.0 --no-git-tag-version
# Then commit and tag
git add package.json package-lock.json
git commit -m "chore(release): bump version to v0.2.0"
git tag -a v0.2.0 -m "Release v0.2.0 — Branding Upgrade"
```

### Tagging Convention

Always use annotated tags with release notes:

```bash
git tag -a v0.2.0 -m "v0.2.0 — BAJAJ AL PRINCE Branding Upgrade

Features:
- New brand identity system
- Updated color palette and typography
- Logo integration across all pages
- Responsive brand guidelines

Security:
- No changes

Breaking:
- None

Migration:
- None required
"
```

---

## 5. Release Branch Workflow

```
develop ──────────────────────────────────────────────────────
         \                       /
          feature/inventory    /
           \                  /
            \────────────────/
             \
              release/v0.5.0 ── testing ──> main ── tag v0.5.0
             /                                    \
            /                                      \
           /                                        \
          /                                          v
         /                                       GitHub Release
        /                                        Docker image
       /                                         Deploy staging
      /
  hotfix/v0.5.1 ──> main (tag v0.5.1) + develop
```

---

## 6. Changelog Maintenance

Every release **must** update `docs/CHANGELOG.md` with:

- Version & date
- Added features (with PR references)
- Fixed bugs (with issue references)
- Security improvements
- Breaking changes
- Migration instructions
- Known limitations

---

## 7. Deprecation Policy

- Mark deprecated APIs in code with `@deprecated` + version
- Support deprecated APIs for **2 minor versions** or **6 months**
- Remove only in MAJOR releases with documented migration path
