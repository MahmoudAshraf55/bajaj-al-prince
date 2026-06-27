# Git Governance

## Branching Strategy

- `main` — Production-ready code. Only merged from `develop` via release PRs.
- `develop` — Integration branch for ongoing work. All feature branches merge here.
- `feature/*` — New features. Branch from `develop`, merge back via PR.
- `fix/*` — Bug fixes. Branch from `develop`.
- `release/*` — Release preparation. Branch from `develop`, merge to `main` and back to `develop`.

## Commit Convention

Use Conventional Commits:

```
<type>(<scope>): <description>

feat:     New feature
fix:      Bug fix
chore:    Maintenance, tooling, config
docs:     Documentation
refactor: Code restructuring
test:     Test changes
security: Security fix
design:   UI/UX changes
```

## Pull Request Process

1. Create feature/fix branch from `develop`.
2. Ensure CI checks pass (typecheck, lint, build, test).
3. Open PR to `develop` with description of changes.
4. Request review from at least one maintainer.
5. Squash-merge with conventional commit message.

## Release Process

1. Create `release/X.Y.Z` from `develop`.
2. Bump version in `package.json`.
3. Run full test suite.
4. Create PR to `main`.
5. Tag release with `vX.Y.Z`.
6. Merge back to `develop`.
