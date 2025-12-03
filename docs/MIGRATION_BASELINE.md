# Database Migration Baseline Guide

## Overview

**Baselining** is the process of marking existing migrations as "already applied" in a database that was created using `prisma db push` instead of `prisma migrate deploy`. This is necessary when:

1. Your production database was originally created with `db:push` (no migration history)
2. You want to start using Prisma Migrate for safer, incremental schema changes
3. The `_prisma_migrations` table does not exist or is empty

After baselining, you can use `prisma migrate deploy` for all future schema changes, enabling:

- Rollback capabilities
- Migration history tracking
- Safer production deployments
- CI/CD pipeline integration

## When You Need to Baseline

You need to baseline if:

- [ ] Database was created with `pnpm db:push` or `npx prisma db push`
- [ ] The `_prisma_migrations` table does not exist
- [ ] The `_prisma_migrations` table exists but is empty
- [ ] You want to transition from `db:push` to `migrate deploy`

You do **NOT** need to baseline if:

- Database was created with `prisma migrate deploy`
- `_prisma_migrations` table already contains migration records
- This is a fresh database with no data

## Prerequisites

Before starting:

1. **Backup your database** (critical for production)
2. SSH access to production server OR direct database access
3. Current migrations exist in `prisma/migrations/` directory
4. Verify your schema matches production (run `prisma db pull` to check)

## Current Migrations

The gthanks project has the following migrations that may need baselining:

| Migration Name                                 | Description                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `0_baseline`                                   | Initial schema with all tables (User, Wish, List, Group, etc.)                  |
| `20251122_reservation_authentication_required` | Adds SiteSettings, updates Reservation to require userId                        |
| `20251202_add_personal_access_tokens`          | Adds PersonalAccessToken table, ListWish.sortOrder, Reservation purchase fields |

## Step 1: Backup Your Database

**SQLite:**

```bash
# On production server
cp data/gthanks.db data/gthanks.db.backup-$(date +%Y%m%d-%H%M%S)
```

**PostgreSQL:**

```bash
# Export full database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Or with compression
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

## Step 2: Verify Your Database State

Check if the migrations table exists and its contents:

**SQLite:**

```bash
# Check if migrations table exists
sqlite3 data/gthanks.db ".tables" | grep _prisma_migrations

# If it exists, check contents
sqlite3 data/gthanks.db "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;"
```

**PostgreSQL:**

```bash
# Check if migrations table exists
psql $DATABASE_URL -c "\dt _prisma_migrations"

# If it exists, check contents
psql $DATABASE_URL -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;"
```

**Expected output for a database needing baselining:**

- Table does not exist, OR
- Table exists but is empty

## Step 3: Verify Schema Matches

Before baselining, ensure your database schema matches the Prisma schema:

```bash
# Generate a diff between your schema and the database
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

If this outputs SQL statements, your database schema differs from `schema.prisma`. You must resolve these differences before baselining:

- If database has extra columns/tables: Update `schema.prisma` to match
- If database is missing columns/tables: Run `db:push` first, then baseline

## Step 4: Baseline the Database

Run `prisma migrate resolve` for each migration in chronological order. This marks migrations as applied without executing them.

```bash
# Mark the baseline migration as applied
npx prisma migrate resolve --applied 0_baseline

# Mark subsequent migrations as applied
npx prisma migrate resolve --applied 20251122_reservation_authentication_required
npx prisma migrate resolve --applied 20251202_add_personal_access_tokens
```

**For Docker deployments:**

```bash
docker exec -it gthanks-app npx prisma migrate resolve --applied 0_baseline
docker exec -it gthanks-app npx prisma migrate resolve --applied 20251122_reservation_authentication_required
docker exec -it gthanks-app npx prisma migrate resolve --applied 20251202_add_personal_access_tokens
```

**Important:** Run these commands in order from oldest to newest migration.

## Step 5: Verify Baseline

Confirm all migrations are marked as applied:

```bash
npx prisma migrate status
```

**Expected output:**

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "gthanks.db" at "file:./data/gthanks.db"

3 migrations found in prisma/migrations

No pending migrations to apply.
```

Also verify the migrations table:

**SQLite:**

```bash
sqlite3 data/gthanks.db "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;"
```

**PostgreSQL:**

```bash
psql $DATABASE_URL -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;"
```

**Expected output:**

```
migration_name                                | finished_at
----------------------------------------------|-------------------------
0_baseline                                    | 2025-12-02 10:30:00.000
20251122_reservation_authentication_required  | 2025-12-02 10:30:01.000
20251202_add_personal_access_tokens           | 2025-12-02 10:30:02.000
```

## Step 6: Test the Application

After baselining, verify the application works correctly:

```bash
# Start the application
pnpm dev  # or docker compose up

# Test critical flows:
# - User login
# - Create/view wishes
# - Create/view lists
# - Group management
# - Reservations
```

## Future Migrations

After baselining, use `prisma migrate deploy` for all future schema changes:

```bash
# In development: Create new migration
npx prisma migrate dev --name add_new_feature

# In production: Apply pending migrations
npx prisma migrate deploy
```

**Docker entrypoint integration:**

The `docker-entrypoint.sh` script should run `prisma migrate deploy` on startup:

```bash
#!/bin/sh
npx prisma generate
npx prisma migrate deploy
exec "$@"
```

## Troubleshooting

### Error: P3005 - Database schema is not empty

**Cause:** Prisma detected existing tables but no migration history.

**Solution:** This is expected! Use `migrate resolve --applied` to baseline.

### Error: P3006 - Migration failed to apply cleanly

**Cause:** The migration SQL doesn't match the current database state.

**Solution:**

1. Check which specific migration failed
2. Compare migration SQL with actual database schema
3. If database already has the changes, use `--applied` to skip
4. If database is missing changes, manually apply them first

### Error: Migration already applied

**Cause:** Running `migrate resolve --applied` on an already-recorded migration.

**Solution:** This is harmless. The migration is already marked as applied.

### Database and schema out of sync

**Cause:** `db:push` was used after some migrations were already applied.

**Solution:**

```bash
# Check current state
npx prisma migrate status

# Generate diff to see what's different
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# Apply any missing changes manually or via db:push
npx prisma db push

# Then baseline remaining migrations
npx prisma migrate resolve --applied <migration_name>
```

### Rollback after failed baseline

If something goes wrong during baselining:

**SQLite:**

```bash
# Restore from backup
cp data/gthanks.db.backup-YYYYMMDD-HHMMSS data/gthanks.db
```

**PostgreSQL:**

```bash
# Restore from backup
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
```

## Common Prisma Migrate Errors

| Error Code | Description                      | Resolution                                      |
| ---------- | -------------------------------- | ----------------------------------------------- |
| P3005      | Schema is not empty              | Expected for baselining; use `--applied`        |
| P3006      | Migration failed to apply        | Check SQL matches database state                |
| P3008      | Migration already recorded       | Already baselined; no action needed             |
| P3009      | Migration failed and rolled back | Check migration SQL for errors                  |
| P3017      | Migration not found              | Ensure migration exists in `prisma/migrations/` |

## Safety Checklist

Before baselining production:

- [ ] Database backup created and verified
- [ ] Tested baseline process in staging environment
- [ ] Verified schema matches with `prisma migrate diff`
- [ ] All migrations exist in `prisma/migrations/` directory
- [ ] Application downtime scheduled (if needed)
- [ ] Rollback plan documented
- [ ] Team notified of maintenance window

After baselining:

- [ ] `prisma migrate status` shows no pending migrations
- [ ] `_prisma_migrations` table contains all migration records
- [ ] Application starts without database errors
- [ ] Critical user flows tested and working
- [ ] Backup retained for at least 7 days

## Production Deployment Workflow

After baselining, your deployment workflow becomes:

1. **Development:** Create migrations with `prisma migrate dev`
2. **Testing:** Apply migrations in staging with `prisma migrate deploy`
3. **Production:** Deploy code, then `prisma migrate deploy` runs automatically

**CI/CD Example (GitHub Actions):**

```yaml
- name: Deploy database migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Docker Compose Example:**

```yaml
services:
  app:
    command: sh -c "npx prisma migrate deploy && node server.js"
```

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Baselining a Database](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/baselining)
- [Production Troubleshooting](https://www.prisma.io/docs/guides/database/production-troubleshooting)
- [gthanks Database Migration Guide](./DATABASE_MIGRATION.md)
- [gthanks PostgreSQL Setup](./POSTGRESQL_SETUP.md)

---

**Last Updated:** 2025-12-02
**Status:** Production-ready
