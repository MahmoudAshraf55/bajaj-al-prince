# Versioning Strategy

## Semantic Versioning (SemVer)

Given a version number `MAJOR.MINOR.PATCH`:

- **MAJOR** (v1.0.0, v2.0.0): Breaking changes, full ERP platform milestone.
- **MINOR** (v0.1.0 → v0.2.0): New features, non-breaking additions.
- **PATCH** (v0.1.0 → v0.1.1): Bug fixes, performance improvements.

## Release Roadmap

| Version | Focus | Status |
|---------|-------|--------|
| v0.1.0 | Prototype — Public site, booking, market, admin auth | ✅ Complete |
| v0.2.0 | Branding — BAJAJ AL PRINCE identity, full bilingual, WhatsApp | ✅ Complete |
| v0.3.0 | Security — RBAC hardening, 2FA, audit trail | 🔄 In Progress |
| v0.4.0 | Work Orders — Service intake, mechanic assignment | 📅 Planned |
| v0.5.0 | Inventory — Stock tracking, parts catalog | 📅 Planned |
| v0.6.0 | Customer Portal — Self-service, history, invoices | 📅 Planned |
| v0.7.0 | POS — In-person sales, receipt generation | 📅 Planned |
| v1.0.0 | Commercial — Complete ERP platform | 📅 Target |

## Backward Compatibility

- API is versioned under `/api/v1/`. Old versions are maintained via Next.js rewrites.
- Database migrations are additive (no destructive changes to production data).
- Breaking changes require a MAJOR version bump and migration guide.
