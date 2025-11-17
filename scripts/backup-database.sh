#!/bin/bash
# gthanks Database Backup Script
#
# Supports both SQLite and PostgreSQL databases
# Automatic compression for PostgreSQL backups
# 30-day retention policy (configurable)
#
# Usage:
#   ./scripts/backup-database.sh                    # Auto-detect database type
#   DB_TYPE=sqlite ./scripts/backup-database.sh     # Force SQLite backup
#   DB_TYPE=postgres ./scripts/backup-database.sh   # Force PostgreSQL backup

set -e  # Exit on error

# Configuration
BACKUP_DIR="data/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

# Detect database type from environment or docker-compose
if [ -z "$DB_TYPE" ]; then
  # Auto-detect from running containers
  if docker compose ps | grep -q "gthanks-postgres"; then
    DB_TYPE="postgres"
  else
    DB_TYPE="sqlite"
  fi
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 gthanks Database Backup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Database Type: $DB_TYPE"
echo "Timestamp:     $TIMESTAMP"
echo "Backup Dir:    $BACKUP_DIR"
echo ""

if [ "$DB_TYPE" = "postgres" ]; then
  # PostgreSQL backup
  echo "📦 Backing up PostgreSQL database..."

  # Check if postgres container is running
  if ! docker compose ps postgres | grep -q "Up"; then
    echo "❌ ERROR: PostgreSQL container is not running"
    exit 1
  fi

  # Get database credentials from environment or defaults
  POSTGRES_USER="${POSTGRES_USER:-gthanks}"
  POSTGRES_DB="${POSTGRES_DB:-gthanks}"

  # Perform backup
  docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/gthanks-$TIMESTAMP.sql"

  # Compress backup
  echo "🗜️  Compressing backup..."
  gzip "$BACKUP_DIR/gthanks-$TIMESTAMP.sql"

  BACKUP_FILE="gthanks-$TIMESTAMP.sql.gz"
  BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)

  echo "✅ PostgreSQL backup complete!"
  echo "   File: $BACKUP_FILE"
  echo "   Size: $BACKUP_SIZE"

else
  # SQLite backup
  echo "📦 Backing up SQLite database..."

  # Check if database file exists
  if [ ! -f "data/gthanks.db" ]; then
    echo "❌ ERROR: Database file not found: data/gthanks.db"
    echo "   Make sure the database exists or the path is correct."
    exit 1
  fi

  # Perform backup (simple file copy for SQLite)
  cp "data/gthanks.db" "$BACKUP_DIR/gthanks-$TIMESTAMP.db"

  BACKUP_FILE="gthanks-$TIMESTAMP.db"
  BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)

  echo "✅ SQLite backup complete!"
  echo "   File: $BACKUP_FILE"
  echo "   Size: $BACKUP_SIZE"
fi

echo ""

# Retention policy: Keep last N backups
echo "🧹 Applying retention policy (keeping last $RETENTION_DAYS backups)..."

# Count existing backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/gthanks-*.{db,sql.gz} 2>/dev/null | wc -l | tr -d ' ')

if [ "$BACKUP_COUNT" -gt "$RETENTION_DAYS" ]; then
  # Delete old backups (keep only the latest RETENTION_DAYS)
  OLD_BACKUPS=$(ls -t "$BACKUP_DIR"/gthanks-*.{db,sql.gz} 2>/dev/null | tail -n +"$((RETENTION_DAYS + 1))")

  if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | xargs rm -v
    echo "   Deleted $((BACKUP_COUNT - RETENTION_DAYS)) old backup(s)"
  fi
else
  echo "   No cleanup needed ($BACKUP_COUNT backups, limit: $RETENTION_DAYS)"
fi

echo ""

# Show recent backups
echo "📊 Recent backups:"
ls -lh "$BACKUP_DIR" | grep "gthanks-" | tail -5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
