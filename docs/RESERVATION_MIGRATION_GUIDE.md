# Reservation System Migration Guide

## Overview

This guide covers migrating from the old anonymous reservation system to the new authentication-required system implemented in PHASE 0-9 of the Reservation System Plan.

## Breaking Changes

⚠️ **CRITICAL**: This is a breaking schema change that will delete all existing reservations.

### Schema Changes

**Removed Fields:**

- `reserverEmail` (String?)
- `reserverName` (String?)
- `accessToken` (String?)
- `reminderSentAt` (DateTime?)

**Added Fields:**

- `userId` (String, required)
- `user` (relation to User model)

### Why Delete Existing Reservations?

The old schema used optional `reserverEmail` for anonymous reservations. The new schema requires `userId` (not optional), making it impossible to migrate anonymous reservations without user accounts.

**Decision**: Clean break - delete old reservations and start fresh with authenticated-only system.

## Migration Steps

### Step 1: Backup Production Database

```bash
# SQLite backup
cp data/gthanks.db data/gthanks-backup-$(date +%Y%m%d).db

# PostgreSQL backup
pg_dump $DATABASE_URL > gthanks-backup-$(date +%Y%m%d).sql
```

### Step 2: Check Existing Reservations

```bash
# Count existing reservations
echo "SELECT COUNT(*) as reservation_count FROM Reservation;" | sqlite3 data/gthanks.db
```

If count > 0, notify users that reservations will be reset.

### Step 3: Apply Schema Migration

**Option A: Using db push (Development)**

```bash
pnpm prisma db push
```

**Option B: Using migrations (Production)**

```bash
# Create migration
pnpm prisma migrate dev --name reservation_authentication_required

# Apply to production
pnpm prisma migrate deploy
```

### Step 4: Verify Migration

```bash
pnpm prisma studio
# Check that:
# 1. Reservation table has userId column
# 2. Old columns (reserverEmail, reserverName, accessToken) are gone
# 3. Reservations table is empty
```

## Docker Deployment

### Update docker-entrypoint.sh

The existing `docker-entrypoint.sh` already handles schema changes automatically:

```bash
# It runs:
pnpm prisma generate
pnpm prisma db push
```

No changes needed to Docker deployment scripts!

### Environment Variables

Ensure these are set:

```env
DATABASE_URL=postgresql://user:pass@host:5432/gthanks
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@your-domain.com
```

### Deployment Process

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild Docker image
docker compose build

# 3. Stop existing container
docker compose down

# 4. Start with new schema (auto-migrates)
docker compose up -d

# 5. Verify
docker compose logs app | grep "prisma"
```

The schema will be automatically applied via `docker-entrypoint.sh`.

## Rollback Plan

If migration fails:

### SQLite Rollback

```bash
# Stop application
docker compose down

# Restore backup
cp data/gthanks-backup-YYYYMMDD.db data/gthanks.db

# Revert to previous code version
git checkout <previous-commit>

# Restart
docker compose up -d
```

### PostgreSQL Rollback

```bash
# Restore from backup
psql $DATABASE_URL < gthanks-backup-YYYYMMDD.sql

# Revert code
git checkout <previous-commit>

# Restart
docker compose restart
```

## Post-Migration Checklist

- [ ] Backup database completed
- [ ] Migration applied successfully
- [ ] Prisma Studio shows new schema
- [ ] No old reservation data (expected)
- [ ] Users can create new authenticated reservations
- [ ] Email confirmations working
- [ ] My Reservations page accessible
- [ ] Cancel reservation functionality working

## Support

If migration fails:

1. Check Docker logs: `docker compose logs app`
2. Verify DATABASE_URL is correct
3. Check Prisma schema matches source code
4. Ensure SMTP credentials are valid
5. Restore from backup and retry

## Timeline

- Schema changes: Immediate (next deployment)
- User impact: Existing reservations lost (notify users)
- Downtime: ~2 minutes (restart only)

**Last Updated**: 2025-11-21  
**Status**: Ready for production deployment
