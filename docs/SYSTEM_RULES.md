# System Rules

## Security Controls

1. **Authentication**: All admin routes require JWT verification via middleware. Tokens are signed with HS256 using `jose`. Access tokens expire in 1 hour, refresh tokens in 7 days.
2. **Authorization**: Role-based access control (admin, staff, viewer). Use `requireAuth` and `requireRole` guards on all admin API routes.
3. **Input Validation**: All API request bodies must be validated with Zod schemas. Use `sanitizedString` from `@/lib/sanitize` for XSS protection.
4. **Rate Limiting**: Sensitive endpoints (login, booking, contact) are rate-limited via Upstash Redis.
5. **Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy are set globally in `next.config.mjs`.
6. **Secrets**: Never commit `.env` files. Rotate `JWT_SECRET` quarterly. Use different secrets per environment.

## CI/CD Pipeline

- All pushes to `develop` and `main` trigger GitHub Actions.
- Pipeline runs: typecheck → lint → build → test.
- PRs require passing CI checks before merge.

## Operational Controls

- Database backups run daily via `scripts/backup.sh`.
- Audit logs capture all create/update/delete operations on business entities.
- Soft delete is enforced globally — no hard deletes.
- Monitoring via Sentry (when configured).
