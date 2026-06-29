# Disaster Recovery (DR) Plan — Bajaj Al Prince ERP

## Overview

This document outlines the disaster recovery procedures for the Bajaj Al Prince ERP system, including backup verification, restore procedures, and failover protocols.

## Architecture

- **Hosting:** Vercel (serverless)
- **Database:** PostgreSQL (Neon)
- **File Storage:** Local `public/uploads/` (ephemeral on serverless)
- **Backups:** `scripts/backup.sh` → local + optional S3/R2

## Backup Strategy

### Automated Backups

1. **Script:** `scripts/backup.sh`
2. **Output:** `backups/bajaj_al_prince_YYYYMMDD_HHMMSS.sql.gz` (compressed)
3. **Retention:** 30 local copies
4. **S3 Upload:** Optional (set `S3_BUCKET` in `.env`)
5. **Schedule:** Configure via cron job or CI scheduled workflow

### Manual Backup

```bash
./scripts/backup.sh
```

### What's Backed Up

- Full PostgreSQL database dump (all tables, sequences, indexes)
- Includes `--clean --if-exists` for idempotent restore
- Compressed with gzip level 9

## Restore Procedure

### 1. Pre-Restore Checklist

- [ ] Confirm the backup file exists and is valid
- [ ] Notify stakeholders of planned downtime
- [ ] Ensure DATABASE_URL is correctly set in `.env`
- [ ] Have a rollback plan ready

### 2. Verify Backup Integrity

```bash
# Check file is not corrupted
gzip -t backups/bajaj_al_prince_YYYYMMDD_HHMMSS.sql.gz

# Preview contents (first 50 lines)
zcat backups/bajaj_al_prince_YYYYMMDD_HHMMSS.sql.gz | head -50

# Check file size is reasonable (> 100KB)
ls -lh backups/bajaj_al_prince_YYYYMMDD_HHMMSS.sql.gz
```

### 3. Restore to Database

```bash
# Extract DATABASE_URL
DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d'"' -f2 | cut -d"'" -f2)

# Parse connection details
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^\/]*\/\([^?]*\).*/\1/p')

# Restore
export PGPASSWORD="$DB_PASS"
zcat backups/bajaj_al_prince_YYYYMMDD_HHMMSS.sql.gz | \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
unset PGPASSWORD
```

### 4. Post-Restore Verification

```bash
# Verify row counts match expected
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT 'products' as table, count(*) FROM "Product"
  UNION ALL SELECT 'customers', count(*) FROM "Customer"
  UNION ALL SELECT 'invoices', count(*) FROM "Invoice"
  UNION ALL SELECT 'journal_entries', count(*) FROM "JournalEntry";
"
```

### 5. Application Verification

- [ ] `npm run build` succeeds
- [ ] Health check passes: `GET /api/health/`
- [ ] Admin login works
- [ ] POS can create invoices
- [ ] Dashboard loads with correct KPIs
- [ ] Market page shows products

## Restore Test Procedure

Run this quarterly to verify backup integrity:

1. Create a test database (or use a Neon branch)
2. Run the restore procedure against the test database
3. Run `npx prisma migrate status` to verify migration state
4. Run `npx vitest run` for unit tests
5. Run `npx playwright test --project=chromium` for E2E tests
6. Document results: date, backup file, test outcome

## RTO and RPO

- **RTO (Recovery Time Objective):** 2 hours
- **RPO (Recovery Point Objective):** 24 hours (based on backup frequency)

## Emergency Contacts

- **Database:** Neon dashboard (check connection status)
- **Hosting:** Vercel dashboard (check deployment status)
- **Domain/DNS:** Check registrar

## Failover

Since we use Neon (managed PostgreSQL), Neon provides:
- Automatic failover to a replica
- Point-in-time recovery (up to 30 days on free tier)
- Connection pooling

If Neon is down:
1. Check Neon status page
2. If prolonged outage, restore latest backup to a new Neon project or local PostgreSQL
3. Update `DATABASE_URL` in Vercel environment variables
4. Redeploy: `npx vercel --prod`
