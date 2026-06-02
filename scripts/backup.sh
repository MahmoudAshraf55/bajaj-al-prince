#!/usr/bin/env bash
# =============================================================================
# Bajaj Al Prince — PostgreSQL Backup Script
# =============================================================================
# Usage: ./scripts/backup.sh
# Requires: pg_dump, DATABASE_URL in .env
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env not found at $ENV_FILE"
  exit 1
fi

# Extract DATABASE_URL from .env
DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d'"' -f2 | cut -d"'" -f2)

if [[ -z "$DATABASE_URL" ]]; then
  echo "❌ DATABASE_URL not found in .env"
  exit 1
fi

# Parse connection string
# postgresql://user:password@host:port/db?schema=public
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^\/]*\/\([^?]*\).*/\1/p')

BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bajaj_al_prince_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "📦 Starting PostgreSQL backup..."
echo "   Database: $DB_NAME"
echo "   Host:     $DB_HOST"
echo "   Port:     $DB_PORT"
echo "   User:     $DB_USER"
echo "   File:     $BACKUP_FILE"

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
  > "$BACKUP_FILE"

unset PGPASSWORD

echo "✅ Backup completed: $BACKUP_FILE"

# Keep only last 7 backups
ls -1t "$BACKUP_DIR"/*.sql | tail -n +8 | xargs -r rm -f
echo "🧹 Old backups cleaned (kept last 7)"
