# Prisma Migration Pre-Commit Hook

## Overview

The `check-migrations.sh` script validates Prisma migrations before commits to prevent accidental data loss and ensure migration best practices.

## What It Checks

1. **Schema Drift Detection**: Warns if `prisma/schema.prisma` changes without a corresponding migration
2. **Destructive Operations**: Blocks commits with migrations that drop tables/columns or modify data types
3. **Migration Analysis**: Uses `analyze-migration.js` to parse SQL and detect potentially dangerous operations

## Setup

### Install as Pre-Commit Hook

```bash
# Option 1: Copy to git hooks
cp scripts/check-migrations.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Option 2: Use Husky (if configured)
# Add to .husky/pre-commit:
bash scripts/check-migrations.sh
```

## Usage

The hook runs automatically on `git commit`. You can also run it manually:

```bash
# Run manually
./scripts/check-migrations.sh

# Bypass hook if needed (use with caution!)
git commit --no-verify
```

## Example Outputs

### Scenario 1: Schema drift (warning, commit allowed)

```
[Migration Check] Starting validation...
[Migration Check] Schema file is staged, checking for drift...
[Migration Check] Schema changes detected but no migration created.
Run 'npx prisma migrate dev --name your_migration_name' to create a migration.
Allowing commit to proceed (create migration before pushing).
[Migration Check] Passed
```

**Action:** Create a migration before pushing:

```bash
npx prisma migrate dev --name add_user_field
```

### Scenario 2: Safe migration (commit allowed)

```
[Migration Check] Starting validation...
[Migration Check] Found new migration files, analyzing for destructive operations...
[Migration Check] Analyzing: prisma/migrations/20231115_add_field/migration.sql
[Migration Check] Passed
```

**Action:** Commit proceeds normally.

### Scenario 3: Destructive migration (commit blocked)

```
[Migration Check] Starting validation...
[Migration Check] Found new migration files, analyzing for destructive operations...
[Migration Check] Analyzing: prisma/migrations/20231115_drop_column/migration.sql
[Migration Check] Destructive operations found in: prisma/migrations/20231115_drop_column/migration.sql
[Migration Check] BLOCKED: Destructive migration detected!
Review the migration carefully. Use --no-verify to bypass if intentional.
```

**Action:** Review the migration. If intentional:

```bash
# After careful review, bypass hook
git commit --no-verify -m "feat: drop unused column (reviewed)"
```

## Destructive Operations Detected

The hook blocks migrations containing:

- `DROP TABLE`
- `DROP COLUMN`
- `ALTER COLUMN ... DROP`
- `ALTER COLUMN ... TYPE` (data type changes)
- `TRUNCATE`
- `DELETE FROM` (without WHERE clause)

## Environment Variables

```bash
DATABASE_URL="${DATABASE_URL:-file:./data/gthanks.db}"
```

The script uses the database URL from environment or defaults to SQLite dev database.

## Integration with analyze-migration.js

The script calls `node scripts/analyze-migration.js <migration-file>` for each new migration:

- **Exit 0**: Safe migration (commit allowed)
- **Exit 1**: Destructive operations found (commit blocked)

## Troubleshooting

### "prisma migrate diff" fails

**Cause:** Database connection issue or schema syntax error

**Fix:**

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Verify schema syntax
npx prisma format
npx prisma validate
```

### False positives

**Cause:** The script is conservative and may flag intentional destructive operations

**Fix:**

```bash
# Bypass hook after careful review
git commit --no-verify
```

### Script not running

**Cause:** Hook not installed or not executable

**Fix:**

```bash
# Check hook exists
ls -la .git/hooks/pre-commit

# Make executable
chmod +x .git/hooks/pre-commit
```

## Best Practices

1. **Create migrations early**: Don't accumulate schema changes without migrations
2. **Name migrations descriptively**: `npx prisma migrate dev --name add_user_email_field`
3. **Review destructive migrations**: Always double-check DROP/ALTER operations
4. **Test migrations**: Test on staging before production
5. **Document risky changes**: Add comments in migration SQL explaining destructive operations

## Related Scripts

- `scripts/analyze-migration.js` - Parses SQL and detects destructive operations
- `scripts/check-migrations.sh` - This pre-commit hook (main entry point)

## See Also

- [Prisma Migration Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Project Migration Guide](/docs/DATABASE_MIGRATION.md)
