# Release Management

## Pre-Release Checklist

- [ ] All tests pass (`npm run test`)
- [ ] TypeScript check passes (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No high-severity security vulnerabilities (`npm run audit`)
- [ ] CHANGELOG updated with all changes since last release
- [ ] Version bumped in `package.json`
- [ ] Database migrations run and tested
- [ ] Environment variables documented in `.env.example`
- [ ] Screenshots updated for new UI features

## Release Steps

1. Create `release/X.Y.Z` from `develop`.
2. Update `package.json` version.
3. Run full test suite.
4. Create PR to `main`.
5. After merge, tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
6. Deploy to production.
7. Merge release branch back to `develop`.

## Hotfix Process

1. Branch `hotfix/X.Y.Z+1` from `main`.
2. Apply fix.
3. PR to `main` and `develop`.
4. Tag and deploy.

## Rollback Plan

- If deployment fails, revert to previous tag.
- Database rollback: use Prisma migration down (if available) or manual restore from backup.
- WhatsApp service rollback: redeploy previous version of the Express service.
