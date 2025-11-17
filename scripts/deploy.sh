#!/bin/bash
# gthanks Production Deployment Script
#
# Automated deployment with:
# - Git version tagging
# - Pre-deployment database backup
# - Docker image versioning
# - Health check verification
# - Rollback support
#
# Usage:
#   ./scripts/deploy.sh                                      # Deploy with SQLite
#   COMPOSE_FILE=docker-compose.postgres.yml ./scripts/deploy.sh  # Deploy with PostgreSQL
#   SKIP_BACKUP=true ./scripts/deploy.sh                     # Skip database backup (not recommended)

set -e  # Exit on error

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BRANCH="${BRANCH:-main}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_HEALTH_CHECK="${SKIP_HEALTH_CHECK:-false}"

# Detect database type from compose file
if echo "$COMPOSE_FILE" | grep -q "postgres"; then
  export DB_TYPE="postgres"
else
  export DB_TYPE="sqlite"
fi

# Get version from git
VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "unknown")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 gthanks Production Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Version:       $VERSION"
echo "Branch:        $BRANCH"
echo "Compose File:  $COMPOSE_FILE"
echo "Database Type: $DB_TYPE"
echo ""

# Verify compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ ERROR: Compose file not found: $COMPOSE_FILE"
  exit 1
fi

# Verify we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "⚠️  WARNING: Current branch is '$CURRENT_BRANCH', expected '$BRANCH'"
  read -p "Continue anyway? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
  fi
fi

# Step 1: Pull latest code
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 Step 1/6: Pulling latest code..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

NEW_VERSION=$(git describe --tags --always 2>/dev/null || echo "unknown")
if [ "$NEW_VERSION" != "$VERSION" ]; then
  echo "✅ Updated to version: $NEW_VERSION"
  VERSION="$NEW_VERSION"
else
  echo "✅ Already at latest version: $VERSION"
fi

echo ""

# Step 2: Backup database
if [ "$SKIP_BACKUP" = "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⏭️  Step 2/6: Database backup (SKIPPED)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  WARNING: Deploying without database backup!"
  echo ""
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Step 2/6: Backing up database..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -f "./scripts/backup-database.sh" ]; then
    ./scripts/backup-database.sh
  else
    echo "⚠️  WARNING: Backup script not found, skipping backup"
  fi

  echo ""
fi

# Step 3: Build Docker image
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 Step 3/6: Building Docker image..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Version tag: $VERSION"
echo ""

# Build with version tag as build argument (can be used in Dockerfile if needed)
docker compose -f "$COMPOSE_FILE" build --build-arg VERSION="$VERSION"

echo ""
echo "✅ Docker image built successfully"
echo ""

# Step 4: Stop old containers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏹️  Step 4/6: Stopping old containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker compose -f "$COMPOSE_FILE" down

echo "✅ Old containers stopped"
echo ""

# Step 5: Start new containers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶️  Step 5/6: Starting new containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker compose -f "$COMPOSE_FILE" up -d

echo "✅ New containers started"
echo ""

# Step 6: Health check
if [ "$SKIP_HEALTH_CHECK" = "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⏭️  Step 6/6: Health check (SKIPPED)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🏥 Step 6/6: Running health check..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Wait for application to start
  echo "⏳ Waiting for application to initialize (10s)..."
  sleep 10

  if [ -f "./scripts/health-check.sh" ]; then
    if ./scripts/health-check.sh; then
      echo ""
    else
      echo ""
      echo "❌ Health check failed!"
      echo ""
      echo "⚠️  Deployment completed but health check failed."
      echo "   Check logs: docker compose -f $COMPOSE_FILE logs -f"
      echo ""
      echo "   To rollback: ./scripts/rollback.sh"
      exit 1
    fi
  else
    echo "⚠️  WARNING: Health check script not found, skipping verification"
  fi

  echo ""
fi

# Deployment summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Deployment Summary:"
echo "   Version:       $VERSION"
echo "   Branch:        $BRANCH"
echo "   Database:      $DB_TYPE"
echo "   Compose File:  $COMPOSE_FILE"
echo ""

# Show running containers
echo "🐳 Running Containers:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "📝 Useful Commands:"
echo "   View logs:     docker compose -f $COMPOSE_FILE logs -f"
echo "   Stop app:      docker compose -f $COMPOSE_FILE down"
echo "   Restart app:   docker compose -f $COMPOSE_FILE restart"
echo "   Rollback:      ./scripts/rollback.sh"
echo ""
