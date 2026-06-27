#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "  Bajaj Al Prince — Database Setup"
echo "============================================"

# Check PostgreSQL
if ! command -v psql &>/dev/null; then
  echo "❌ PostgreSQL is not installed. Install it first:"
  echo "   sudo apt install postgresql postgresql-client"
  exit 1
fi

echo "✅ PostgreSQL found: $(psql --version)"

# Check if database already exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='bajaj_al_prince'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
  echo "✅ Database 'bajaj_al_prince' already exists"
else
  echo "Creating database 'bajaj_al_prince'..."
  sudo -u postgres createdb bajaj_al_prince
  echo "✅ Database created"
fi

# Create user role if not exists
ROLE_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$USER'" 2>/dev/null || echo "0")

if [ "$ROLE_EXISTS" = "1" ]; then
  echo "✅ Role '$USER' already exists"
else
  echo "Creating role '$USER'..."
  sudo -u postgres psql -c "CREATE ROLE $USER LOGIN SUPERUSER;"
  echo "✅ Role created"
fi

# Grant database ownership
sudo -u postgres psql -c "ALTER DATABASE bajaj_al_prince OWNER TO $USER;" 2>/dev/null || true

# Run Prisma
echo ""
echo "Running Prisma migrations..."
npx prisma db push
echo "✅ Prisma sync complete"

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  DATABASE_URL=postgresql://$USER@localhost:5432/bajaj_al_prince?schema=public"
echo "============================================"
