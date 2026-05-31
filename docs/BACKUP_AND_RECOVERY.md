# Backup & Recovery Plan — BAJAJ AL PRINCE

## 1. Repository Backup

### GitHub (Primary)

- **Frequency**: Continuous (every push)
- **Retention**: Unlimited (GitHub default)
- **Method**: `git push origin main`

### Local Backup (Secondary)

```bash
# Daily bare clone
git clone --bare <repo-url> /backup/bajaj-al-prince-$(date +%Y%m%d).git
tar -czf /backup/bajaj-al-prince-$(date +%Y%m%d).git.tar.gz /backup/bajaj-al-prince-$(date +%Y%m%d).git
```

### Cloud Archive (Tertiary)

| Service | Method | Frequency |
|---------|--------|-----------|
| GitHub Enterprise Backup | `gh-repo-backup` | Weekly |
| AWS S3 Glacier | Zip of repo + DB | Monthly |

---

## 2. Database Backup

### SQLite (Current — Development)

```bash
# Automated daily backup (cron)
0 2 * * * cp /project/prisma/dev.db /backups/db/dev-$(date +\%Y\%m\%d).db && gzip /backups/db/dev-$(date +\%Y\%m\%d).db

# Retention: 30 days
find /backups/db -name "*.db.gz" -mtime +30 -delete
```

### PostgreSQL (Production)

```bash
# pg_dump daily
pg_dump -h localhost -U bajaj bajaj_al_prince | gzip > /backups/db/prod-$(date +%Y%m%d).sql.gz

# Point-in-time recovery (PITR) via WAL archiving
# Configure postgresql.conf:
# archive_mode = on
# archive_command = 'cp %p /backups/wal/%f'
```

| Environment | Backup Type | Frequency | Retention |
|-------------|-------------|-----------|-----------|
| Development | Full dump | Daily | 7 days |
| Staging | Full dump | Daily | 14 days |
| Production | Full dump + WAL | Continuous | 30 days |

---

## 3. Environment Variable Backup

### Critical Secrets List

| Secret | Location | Backup Method |
|----------|----------|---------------|
| `JWT_SECRET` | `.env` (local) / GitHub Secrets (CI) | GitHub Secrets export |
| `DATABASE_URL` | `.env` / GitHub Secrets | Vault backup |
| `SMTP_PASS` | GitHub Secrets | Vault backup |
| `AWS_SECRET_ACCESS_KEY` | GitHub Secrets / AWS Secrets Manager | AWS cross-region replication |

### GitHub Secrets Export (Monthly Audit)

```bash
gh secret list --repo owner/bajaj-al-prince > /backups/secrets/$(date +%Y%m%d)-secrets.txt
```

> **Never commit secrets to the repository.** Use a password manager or secrets vault.

---

## 4. Disaster Recovery Procedures

### Scenario A: Repository Corruption / Accidental Delete

1. **Identify last good state**
   ```bash
   git reflog
   git log --all --oneline --graph
   ```

2. **Restore from GitHub clone**
   ```bash
   git clone https://github.com/owner/bajaj-al-prince.git
   ```

3. **Restore from local bare clone**
   ```bash
   git clone /backup/bajaj-al-prince-YYYYMMDD.git
   ```

### Scenario B: Database Corruption

1. **Stop application**
   ```bash
   pm2 stop bajaj-al-prince
   ```

2. **Restore from latest backup**
   ```bash
   # SQLite
cp /backups/db/dev-YYYYMMDD.db /project/prisma/dev.db

   # PostgreSQL
   gunzip -c /backups/db/prod-YYYYMMDD.sql.gz | psql -h localhost -U bajaj bajaj_al_prince
   ```

3. **Verify data integrity**
   ```bash
   npx prisma db pull
   npx prisma validate
   npm run build && npm start
   ```

4. **Resume application**
   ```bash
   pm2 start bajaj-al-prince
   ```

### Scenario C: Secret Compromise

1. **Rotate JWT_SECRET immediately**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Update `.env` and GitHub Secrets**

3. **Force logout all users** (tokens signed with old secret are invalid)

4. **Audit logs** for unauthorized access

5. **Update `.env.example`** with new placeholder format

### Scenario D: Complete Server Failure

1. **Provision new server**
2. **Clone repository**: `git clone <repo-url>`
3. **Install dependencies**: `npm ci`
4. **Restore database** from latest backup
5. **Set environment variables** from vault
6. **Run migrations**: `npx prisma migrate deploy`
7. **Build**: `npm run build`
8. **Start**: `pm2 start ecosystem.config.js`

---

## 5. Recovery Time Objectives (RTO)

| Component | RTO | RPO |
|-----------|-----|-----|
| Source Code | 15 min | 0 (GitHub) |
| Database | 30 min | 24 hours (daily backup) |
| Secrets | 1 hour | 0 (vault replication) |
| Full System | 2 hours | 24 hours |

---

## 6. Backup Verification

Monthly restore drill:

```bash
# 1. Clone repo to temp
git clone <repo-url> /tmp/restore-test

# 2. Install
cd /tmp/restore-test && npm ci

# 3. Restore DB
cp /backups/db/dev-latest.db /tmp/restore-test/prisma/dev.db

# 4. Build & test
npm run build
npx playwright test

# 5. Cleanup
rm -rf /tmp/restore-test
```

Document results in `docs/BACKUP_DRILL_LOG.md`.

---

## 7. Contact & Escalation

| Role | Responsibility |
|------|---------------|
| Technical Lead | Recovery coordination |
| DevOps | Infrastructure restoration |
| Security | Secret rotation, incident response |
