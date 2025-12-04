#!/bin/sh
set -e

echo "=== gthanks Docker Entrypoint ==="

# Permission fix for volume mounts (works with bind mounts AND named volumes)
if [ "$(id -u)" = '0' ]; then
  echo "Fixing permissions for data directories..."
  chown -R nextjs:nodejs /app/data /app/uploads 2>/dev/null || true

  echo "Switching to non-root user (nextjs)..."
  exec gosu nextjs "$0" "$@"
fi

# Everything below runs as 'nextjs' user

# Validate required environment variables
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo ""
  echo "CRITICAL ERROR: NEXTAUTH_SECRET environment variable is not set."
  echo ""
  echo "This variable is essential for NextAuth.js security (session signing/encryption)."
  echo "It MUST be a long, random string."
  echo ""
  echo "To fix this:"
  echo "  1. Generate a secret: openssl rand -base64 32"
  echo "  2. Set it before running docker compose:"
  echo "     export NEXTAUTH_SECRET=your_generated_secret_here"
  echo "     docker compose up -d"
  echo ""
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "CRITICAL ERROR: DATABASE_URL environment variable is not set."
  echo ""
  echo "This variable is required to connect to the database."
  echo "For SQLite (default): DATABASE_URL=file:/app/data/gthanks.db"
  echo "For PostgreSQL: See docker-compose.postgres.yml"
  echo ""
  exit 1
fi

# Wait a moment for any dependent services to be ready
sleep 2

# Database initialization
echo "Initializing database..."
echo "Database URL configured: ${DATABASE_URL%%:*}://..."

# Auto-detect database provider from DATABASE_URL and update schema
# Note: Prisma does NOT support env() for provider, so we must use sed
if echo "$DATABASE_URL" | grep -q "^file:"; then
  echo "Detected SQLite database, updating schema.prisma provider..."
  sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
elif echo "$DATABASE_URL" | grep -qE "^postgres(ql)?:"; then
  echo "Detected PostgreSQL database, ensuring schema.prisma provider is postgresql..."
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
else
  echo "WARNING: Unknown DATABASE_URL protocol, assuming PostgreSQL"
fi

# Backup SQLite database before migrations (safety measure)
if echo "$DATABASE_URL" | grep -q "^file:"; then
  DB_PATH="${DATABASE_URL#file:}"
  # Handle relative paths (convert ./data/file.db to /app/data/file.db)
  case "$DB_PATH" in
    ./*) DB_PATH="/app/${DB_PATH#./}" ;;
  esac

  if [ -f "$DB_PATH" ]; then
    BACKUP_PATH="${DB_PATH}.backup-$(date +%Y%m%d_%H%M%S)"
    echo "Creating backup: $BACKUP_PATH"
    cp "$DB_PATH" "$BACKUP_PATH"

    # Keep only last 5 backups to prevent disk fill
    ls -t "${DB_PATH}.backup-"* 2>/dev/null | tail -n +6 | xargs -r rm -f
    echo "Backup created successfully"
  fi
fi

# Generate Prisma Client for runtime platform, then apply schema
# Use direct binary path to ensure version consistency (avoid npx downloading latest)
node_modules/.bin/prisma generate

# Database sync strategy:
# - PostgreSQL: Use db push (no migration history needed, works across providers)
# - SQLite: Use migrate deploy (preserves migration history for dev)
if echo "$DATABASE_URL" | grep -qE "^postgres(ql)?:"; then
  echo "Applying schema with prisma db push (PostgreSQL)..."
  # Note: --skip-generate since we already ran prisma generate above
  # We don't use --accept-data-loss to prevent accidental data loss in production
  # If schema changes would cause data loss, the deploy will fail (safer)
  node_modules/.bin/prisma db push --skip-generate 2>&1 | tee /tmp/db-push-output.log || {
    if grep -q "destructive changes" /tmp/db-push-output.log; then
      echo ""
      echo "WARNING: Schema changes would cause data loss."
      echo "Review the changes and either:"
      echo "  1. Create a proper migration with data handling"
      echo "  2. Set FORCE_DB_PUSH=true to accept data loss"
      echo ""
      if [ "$FORCE_DB_PUSH" = "true" ]; then
        echo "FORCE_DB_PUSH=true detected, proceeding with --accept-data-loss..."
        node_modules/.bin/prisma db push --skip-generate --accept-data-loss || {
          echo "ERROR: Failed to sync PostgreSQL schema"
          exit 1
        }
      else
        exit 1
      fi
    else
      echo "ERROR: Failed to sync PostgreSQL schema"
      cat /tmp/db-push-output.log
      exit 1
    fi
  }
else
  # SQLite: Try to apply migrations, and if it fails due to P3005, baseline the database
  if ! node_modules/.bin/prisma migrate deploy 2>&1 | tee /tmp/migrate-output.log; then
    # Check if the error is P3005 (database not empty)
    if grep -q "P3005" /tmp/migrate-output.log; then
      echo ""
      echo "Detected existing database without migration history (P3005)"
      echo "Baselining database by marking existing migrations as applied..."
      echo ""

      # Mark the baseline migration as applied (existing schema matches baseline)
      node_modules/.bin/prisma migrate resolve --applied 0_baseline || {
        echo "ERROR: Failed to baseline existing database"
        exit 1
      }

      echo "Database baselined successfully, retrying migration deployment..."

      # Retry migration deployment
      node_modules/.bin/prisma migrate deploy || {
        echo "ERROR: Database migration failed after baselining"
        exit 1
      }
    else
      # Different error, fail
      echo "ERROR: Database migration failed (not a P3005 error)"
      cat /tmp/migrate-output.log
      exit 1
    fi
  fi
fi

echo "Database initialized successfully"

# Verify the application can start
echo "Verifying application readiness..."
if [ ! -f "server.js" ]; then
  echo "ERROR: server.js not found. Build may have failed."
  exit 1
fi

echo "Starting gthanks application..."
exec node server.js
