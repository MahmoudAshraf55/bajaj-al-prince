# Backup and Recovery

## Database Backups

- **Frequency**: Daily automated backup via `scripts/backup.sh`.
- **Retention**: 30 days of daily backups, 12 monthly backups.
- **Storage**: AWS S3 bucket (configured via `AWS_*` env vars).
- **Encryption**: Backups are encrypted at rest using AWS KMS.

## Backup Commands

```bash
# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/backup.sh --restore <backup-file>
```

## WhatsApp Session

- Baileys auth credentials are stored in `.baileys_auth/`.
- This directory is excluded from version control.
- Backup strategy: include in database backup snapshot.

## Incident Response

1. **Database corruption**: Restore from latest backup.
2. **Security breach**: Rotate all secrets, invalidate all JWT tokens (bump `tokenVersion`), restore from pre-breach backup.
3. **Deployment failure**: Rollback to previous release tag.
4. **WhatsApp disconnection**: Re-scan QR code via admin panel.

## Disaster Recovery

- **RPO (Recovery Point Objective)**: 24 hours (daily backups).
- **RTO (Recovery Time Objective)**: 2 hours for database restore, 30 minutes for application redeploy.
- **Cross-region**: Database replicas in secondary region (future enhancement).
