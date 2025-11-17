#!/bin/bash
# gthanks Emergency Rollback Script
#
# Reverts to the previous deployment when issues are detected
# Provides guidance for database restoration
#
# Usage:
#   ./scripts/rollback.sh                                      # Rollback with SQLite
#   COMPOSE_FILE=docker-compose.postgres.yml ./scripts/rollback.sh  # Rollback with PostgreSQL
#   AUTO_CONFIRM=true ./scripts/rollback.sh                    # Skip confirmation prompts (use with caution)

set -e  # Exit on error

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
AUTO_CONFIRM="${AUTO_CONFIRM:-false}"

# Detect database type from compose file
if echo "$COMPOSE_FILE" | grep -q "postgres"; then
  DB_TYPE="postgres"
else
  DB_TYPE="sqlite"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  gthanks ROLLBACK PROCEDURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will revert the application to the previous deployment."
echo ""

# Show current and previous commits
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
CURRENT_VERSION=$(git describe --tags --always 2>/dev/null || echo "unknown")

if [ "$CURRENT_COMMIT" = "unknown" ]; then
  echo "❌ ERROR: Not a git repository or git not available"
  exit 1
fi

PREVIOUS_COMMIT=$(git rev-parse HEAD~1 2>/dev/null || echo "unknown")
PREVIOUS_VERSION=$(git describe --tags --always HEAD~1 2>/dev/null || echo "unknown")

echo "📍 Current Deployment:"
echo "   Commit:  $CURRENT_COMMIT"
echo "   Version: $CURRENT_VERSION"
echo "   Message: $(git log -1 --oneline HEAD 2>/dev/null || echo 'N/A')"
echo ""

if [ "$PREVIOUS_COMMIT" = "unknown" ]; then
  echo "❌ ERROR: Cannot find previous commit (already at first commit?)"
  exit 1
fi

echo "📍 Previous Deployment (rollback target):"
echo "   Commit:  $PREVIOUS_COMMIT"
echo "   Version: $PREVIOUS_VERSION"
echo "   Message: $(git log -1 --oneline HEAD~1 2>/dev/null || echo 'N/A')"
echo ""

# Confirmation prompt
if [ "$AUTO_CONFIRM" != "true" ]; then
  read -p "⚠️  Rollback to previous commit? (yes/no): " CONFIRM_ROLLBACK

  if [ "$CONFIRM_ROLLBACK" != "yes" ]; then
    echo "❌ Rollback cancelled"
    exit 1
  fi
fi

echo ""

# List available database backups
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Available Database Backups"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "data/backups" ] && [ "$(ls -A data/backups 2>/dev/null)" ]; then
  echo ""
  ls -lh data/backups/ | grep "gthanks-" | tail -10
  echo ""
else
  echo ""
  echo "⚠️  No backups found in data/backups/"
  echo ""
fi

# Database restoration prompt
RESTORE_DB="no"
if [ "$AUTO_CONFIRM" != "true" ]; then
  read -p "📦 Restore database from backup? (yes/no): " RESTORE_DB
fi

echo ""

# Step 1: Checkout previous commit
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Step 1/3: Rolling back code..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a detached HEAD at the previous commit
git checkout "$PREVIOUS_COMMIT"

echo "✅ Code rolled back to: $PREVIOUS_VERSION ($PREVIOUS_COMMIT)"
echo ""

# Step 2: Rebuild and restart containers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 Step 2/3: Rebuilding containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop containers
echo "⏹️  Stopping containers..."
docker compose -f "$COMPOSE_FILE" down

# Rebuild image with previous code
echo "🔨 Rebuilding Docker image..."
docker compose -f "$COMPOSE_FILE" build --build-arg VERSION="$PREVIOUS_VERSION"

# Start containers
echo "▶️  Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

echo "✅ Containers rebuilt and started"
echo ""

# Step 3: Database restoration (if requested)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 3/3: Database restoration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$RESTORE_DB" = "yes" ]; then
  echo ""
  echo "⚠️  Manual database restoration required for safety."
  echo ""

  if [ "$DB_TYPE" = "postgres" ]; then
    echo "PostgreSQL Restoration Steps:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Choose a backup file from data/backups/"
    echo "   Example: data/backups/gthanks-20231215-143022.sql.gz"
    echo ""
    echo "2. Decompress the backup (if .gz):"
    echo "   gunzip data/backups/gthanks-TIMESTAMP.sql.gz"
    echo ""
    echo "3. Restore to database:"
    echo "   cat data/backups/gthanks-TIMESTAMP.sql | docker compose -f $COMPOSE_FILE exec -T postgres psql -U gthanks gthanks"
    echo ""
    echo "4. Restart containers:"
    echo "   docker compose -f $COMPOSE_FILE restart"
    echo ""
  else
    echo "SQLite Restoration Steps:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Stop containers:"
    echo "   docker compose -f $COMPOSE_FILE down"
    echo ""
    echo "2. Choose a backup file from data/backups/"
    echo "   Example: data/backups/gthanks-20231215-143022.db"
    echo ""
    echo "3. Replace current database:"
    echo "   cp data/backups/gthanks-TIMESTAMP.db data/gthanks.db"
    echo ""
    echo "4. Restart containers:"
    echo "   docker compose -f $COMPOSE_FILE up -d"
    echo ""
  fi
else
  echo ""
  echo "ℹ️  Database restoration skipped (database unchanged)"
  echo ""
fi

echo ""

# Final instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Rollback Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Current State:"
echo "   Version: $PREVIOUS_VERSION"
echo "   Commit:  $PREVIOUS_COMMIT"
echo "   Branch:  DETACHED HEAD (temporary state)"
echo ""

# Show container status
echo "🐳 Container Status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "⚠️  Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Verify application is working:"
echo "   ./scripts/health-check.sh"
echo ""
echo "2. (Optional) Restore database if needed (see instructions above)"
echo ""
echo "3. Create a hotfix branch to properly fix the issue:"
echo "   git checkout -b hotfix/fix-critical-issue"
echo "   # Make fixes"
echo "   git commit -m 'fix: resolve critical issue'"
echo "   git push origin hotfix/fix-critical-issue"
echo ""
echo "4. OR return to main branch (if rollback was temporary):"
echo "   git checkout main"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:     docker compose -f $COMPOSE_FILE logs -f"
echo "   Stop app:      docker compose -f $COMPOSE_FILE down"
echo "   Restart app:   docker compose -f $COMPOSE_FILE restart"
echo ""
