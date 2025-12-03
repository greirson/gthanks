#!/bin/bash

# Pre-commit hook for Prisma migration validation
# Checks for schema drift and destructive migrations

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Set default DATABASE_URL if not set
export DATABASE_URL="${DATABASE_URL:-file:./data/gthanks.db}"

echo "[Migration Check] Starting validation..."

# Check if prisma/schema.prisma is staged
if git diff --cached --name-only | grep -q "prisma/schema.prisma"; then
  echo "[Migration Check] Schema file is staged, checking for drift..."

  # Check for schema drift (changes not yet migrated)
  if ! npx prisma migrate diff \
    --from-schema-datamodel prisma/schema.prisma \
    --to-schema-datasource prisma/schema.prisma \
    --exit-code &>/dev/null; then

    echo -e "${YELLOW}[Migration Check] Schema changes detected but no migration created.${NC}"
    echo -e "${YELLOW}Run 'npx prisma migrate dev --name your_migration_name' to create a migration.${NC}"
    echo -e "${YELLOW}Allowing commit to proceed (create migration before pushing).${NC}"
  fi
fi

# Check for new migration files in the commit
NEW_MIGRATIONS=$(git diff --cached --name-only --diff-filter=A | grep "prisma/migrations/.*/migration.sql" || true)

if [ -z "$NEW_MIGRATIONS" ]; then
  echo -e "${GREEN}[Migration Check] Passed${NC}"
  exit 0
fi

echo "[Migration Check] Found new migration files, analyzing for destructive operations..."

# Check each new migration file for destructive operations
DESTRUCTIVE_FOUND=0

while IFS= read -r migration_file; do
  if [ -n "$migration_file" ]; then
    echo "[Migration Check] Analyzing: $migration_file"

    # Run the analyze-migration.js script
    if ! node scripts/analyze-migration.js "$migration_file"; then
      DESTRUCTIVE_FOUND=1
      echo -e "${RED}[Migration Check] Destructive operations found in: $migration_file${NC}"
    fi
  fi
done <<< "$NEW_MIGRATIONS"

# Exit based on results
if [ $DESTRUCTIVE_FOUND -eq 1 ]; then
  echo -e "${RED}[Migration Check] BLOCKED: Destructive migration detected!${NC}"
  echo -e "${RED}Review the migration carefully. Use --no-verify to bypass if intentional.${NC}"
  exit 1
fi

echo -e "${GREEN}[Migration Check] Passed${NC}"
exit 0
