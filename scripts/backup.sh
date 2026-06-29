#!/usr/bin/env bash
# =============================================================================
# Bajaj Al Prince — PostgreSQL Backup Script with optional S3/R2 upload
# =============================================================================
# Usage: ./scripts/backup.sh
# Requires: pg_dump, DATABASE_URL in .env
# Optional: AWS CLI + S3_BUCKET env for cloud upload
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found at $ENV_FILE"
  exit 1
fi

# Extract DATABASE_URL from .env
DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d'"' -f2 | cut -d"'" -f2)

if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL not found in .env"
  exit 1
fi

# Parse connection string
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^\/]*\/\([^?]*\).*/\1/p')

BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bajaj_al_prince_${TIMESTAMP}.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup..."
echo "  Database: $DB_NAME"
echo "  Host:     $DB_HOST"
echo "  File:     $COMPRESSED_FILE"

export PGPASSWORD="$DB_PASS"

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --verbose \
  2>/dev/null \
  | gzip -9 \
  > "$COMPRESSED_FILE"

unset PGPASSWORD

echo "Backup completed: $COMPRESSED_FILE"

# Upload to S3/R2 if configured
S3_BUCKET=$(grep '^S3_BUCKET=' "$ENV_FILE" | cut -d'"' -f2 | cut -d"'" -f2 2>/dev/null || echo "")

if [[ -n "$S3_BUCKET" ]]; then
  echo "Uploading to S3 bucket: $S3_BUCKET..."
  if command -v aws &> /dev/null; then
    aws s3 cp "$COMPRESSED_FILE" "s3://$S3_BUCKET/backups/$(basename "$COMPRESSED_FILE")" \
      --storage-class STANDARD_IA \
      --no-progress
    echo "Uploaded to S3: s3://$S3_BUCKET/backups/$(basename "$COMPRESSED_FILE")"
  else
    echo "WARNING: AWS CLI not installed. Skipping S3 upload."
  fi
fi

# Keep only last 30 backups locally
ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
echo "Old backups cleaned (kept last 30)"

# Verify backup is not empty
BACKUP_SIZE=$(stat -c%s "$COMPRESSED_FILE" 2>/dev/null || stat -f%z "$COMPRESSED_FILE" 2>/dev/null || echo 0)
if [[ "$BACKUP_SIZE" -lt 100 ]]; then
  echo "WARNING: Backup file is suspiciously small ($BACKUP_SIZE bytes). Check for errors."
  exit 1
fi

echo "Backup verified: $BACKUP_SIZE bytes"
echo "DONE"
