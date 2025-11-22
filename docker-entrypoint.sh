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

# Generate Prisma Client for runtime platform, then apply migrations
# Use direct binary path to ensure version consistency (avoid npx downloading latest)
node_modules/.bin/prisma generate
node_modules/.bin/prisma migrate deploy || {
  echo "ERROR: Database migration failed"
  exit 1
}

echo "Database initialized successfully"

# Verify the application can start
echo "Verifying application readiness..."
if [ ! -f "server.js" ]; then
  echo "ERROR: server.js not found. Build may have failed."
  exit 1
fi

echo "Starting gthanks application..."
exec node server.js
