# Emergency Rollback Guide

This guide helps you quickly rollback to a previous version of gthanks when a deployment goes wrong.

## Quick Reference (30 Seconds)

```bash
# 1. Check available versions
docker images greirson/gthanks

# 2. Stop current deployment
docker compose down

# 3. Edit docker-compose.yml - change image line:
#    From: image: greirson/gthanks:latest
#    To:   image: greirson/gthanks:v0.0.1  # Your target version

# 4. Start previous version
docker compose up -d

# 5. Verify health
curl http://localhost:3000/api/health
```

---

## Prerequisites

Before rolling back, check:

### 1. Identify Last Known Good Version

```bash
# View deployment history (if you're logging deployments)
docker ps -a --filter "ancestor=greirson/gthanks"

# List available image versions
docker images greirson/gthanks
```

**Example output:**
```
REPOSITORY          TAG       IMAGE ID       CREATED        SIZE
greirson/gthanks    latest    abc123def456   2 hours ago    500MB
greirson/gthanks    v0.0.2    def456abc123   1 day ago      498MB
greirson/gthanks    v0.0.1    789xyz012abc   5 days ago     495MB
```

### 2. Backup Current State

```bash
# Backup database (SQLite)
cp data/gthanks.db data/gthanks.db.backup-$(date +%Y%m%d-%H%M%S)

# Backup database (PostgreSQL)
docker exec gthanks-postgres pg_dump -U gthanks gthanks > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup uploads
tar -czf uploads-backup-$(date +%Y%m%d-%H%M%S).tar.gz uploads/
```

### 3. Check for Database Schema Changes

**CRITICAL**: If the new version included database migrations, you may need to rollback the schema.

```bash
# Check current schema version (if tracked)
docker compose exec app npx prisma migrate status
```

**If schema changed**: See [Database Rollback](#database-rollback) section below.

---

## Rollback Steps

### Step 1: Stop Current Deployment

```bash
# Stop containers (keeps data volumes)
docker compose down

# Verify containers stopped
docker ps
```

**DO NOT use `docker compose down -v`** - this deletes data volumes.

### Step 2: Pull Target Version (if not cached)

```bash
# Pull specific version from Docker Hub
docker pull greirson/gthanks:v0.0.1

# Verify image downloaded
docker images greirson/gthanks:v0.0.1
```

### Step 3: Update docker-compose.yml

**Option A: Edit docker-compose.yml manually**

```bash
# Edit the file
nano docker-compose.yml

# Change line ~12 from:
#   image: greirson/gthanks:latest
# To:
#   image: greirson/gthanks:v0.0.1

# Save and exit (Ctrl+X, Y, Enter in nano)
```

**Option B: Use sed (faster for scripts)**

```bash
# Replace image version
sed -i.bak 's|image: greirson/gthanks:.*|image: greirson/gthanks:v0.0.1|' docker-compose.yml

# Verify change
grep "image: greirson/gthanks" docker-compose.yml
```

### Step 4: Restart with Previous Version

```bash
# Start containers with target version
docker compose up -d

# Follow startup logs
docker compose logs -f app
```

**Watch for:**
- `✓ Prisma Client generated successfully`
- `✓ Database migrations completed`
- `Server listening on http://0.0.0.0:3000`

Press `Ctrl+C` to stop following logs.

### Step 5: Verify Rollback

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"database":true,"timestamp":"2025-11-24T..."}

# Verify containers running
docker compose ps

# Check application in browser
open http://localhost:3000
```

**Test critical functionality:**
- [ ] Login works
- [ ] View wishes
- [ ] Create new wish
- [ ] Share list

---

## Database Rollback

### When Database Rollback is Needed

Rollback the database schema ONLY if:
- New version added/removed database tables
- New version added/removed required columns
- You get schema errors after rolling back application

**Symptoms:**
```
Error: Invalid `prisma.wish.findMany()` invocation:
Column 'newField' does not exist
```

### SQLite Rollback

```bash
# 1. Stop application
docker compose down

# 2. Restore database from backup
cp data/gthanks.db.backup-YYYYMMDD-HHMMSS data/gthanks.db

# 3. Restart application
docker compose up -d
```

### PostgreSQL Rollback

```bash
# 1. Stop application
docker compose down

# 2. Restore database from backup
cat backup-YYYYMMDD-HHMMSS.sql | docker exec -i gthanks-postgres psql -U gthanks gthanks

# 3. Restart application
docker compose up -d
```

### Manual Schema Rollback (Advanced)

If you don't have a database backup:

```bash
# 1. Check Prisma migration history
docker compose exec app npx prisma migrate status

# 2. Rollback to specific migration (if using Prisma Migrate)
# WARNING: This may cause data loss
docker compose exec app npx prisma migrate resolve --rolled-back "20251124_add_new_field"

# 3. Apply old schema
docker compose exec app npx prisma db push --force-reset
```

**WARNING**: `--force-reset` deletes ALL data. Only use with database backup.

---

## Version Pinning (Prevent Auto-Updates)

### Pin Version in docker-compose.yml

```yaml
services:
  app:
    # ❌ Bad - pulls latest automatically
    image: greirson/gthanks:latest

    # ✅ Good - specific version
    image: greirson/gthanks:v0.0.1
```

### Pin Version in CI/CD

If using automated deployments:

```bash
# .github/workflows/deploy.yml or similar
docker pull greirson/gthanks:v0.0.1  # Pin version
docker compose up -d
```

### Prevent Accidental Updates

```bash
# Remove 'latest' tag to avoid accidental pulls
docker rmi greirson/gthanks:latest

# Always pull by specific version
docker pull greirson/gthanks:v0.0.1
```

---

## Verification Checklist

After rollback, verify:

- [ ] Containers running: `docker compose ps`
- [ ] Health check passes: `curl http://localhost:3000/api/health`
- [ ] Database accessible: `docker compose exec app npx prisma studio` (then open http://localhost:5555)
- [ ] Logs show no errors: `docker compose logs app | grep ERROR`
- [ ] Application loads in browser: http://localhost:3000
- [ ] User login works
- [ ] Critical features functional (wishes, lists, groups)
- [ ] Uploads directory intact: `ls -lh uploads/`

---

## Common Issues

### Issue: Container Won't Start After Rollback

**Symptom:**
```
Error: Cannot find module '@prisma/client'
```

**Solution:**
```bash
# Regenerate Prisma Client for old version
docker compose exec app npx prisma generate
docker compose restart app
```

---

### Issue: Database Schema Mismatch

**Symptom:**
```
Error: Column does not exist in current schema
```

**Solution:**
```bash
# Option 1: Restore database from backup (see Database Rollback section)

# Option 2: Push old schema
docker compose exec app npx prisma db push --force-reset
# WARNING: This deletes data. Only use if you have backup.
```

---

### Issue: Uploads Missing After Rollback

**Symptom:** Images not displaying

**Check:**
```bash
# Verify uploads volume is mounted
docker compose exec app ls -lh /app/uploads

# Verify host directory exists
ls -lh uploads/
```

**Solution:**
```bash
# If uploads were deleted, restore from backup
tar -xzf uploads-backup-YYYYMMDD-HHMMSS.tar.gz

# Fix permissions
chmod -R 755 uploads/
chown -R $(id -u):$(id -g) uploads/
```

---

### Issue: Old Version Not Available

**Symptom:**
```
Error: manifest for greirson/gthanks:v0.0.1 not found
```

**Solution:**
```bash
# Check available versions on Docker Hub
curl -s https://hub.docker.com/v2/repositories/greirson/gthanks/tags | jq -r '.results[].name'

# Or rebuild from git tag
git checkout v0.0.1
docker build -t greirson/gthanks:v0.0.1 .
docker compose up -d
```

---

### Issue: Environment Variables Changed

**Symptom:** OAuth/email/features not working after rollback

**Check:**
```bash
# Compare environment variables
docker compose config | grep -A 20 environment
```

**Solution:**
```bash
# Restore old .env file from backup
cp .env.backup-YYYYMMDD .env

# Or manually add missing variables to .env
# Then restart:
docker compose down
docker compose up -d
```

---

## Monitoring After Rollback

### Check Logs for Issues

```bash
# Follow all logs
docker compose logs -f

# Filter for errors
docker compose logs app | grep -i error

# Check last 100 lines
docker compose logs app --tail=100
```

### Monitor Resource Usage

```bash
# Check container stats
docker stats

# Check disk usage
df -h

# Check Docker disk usage
docker system df
```

---

## When Rollback Fails

If rollback doesn't fix the issue:

### 1. Check Infrastructure

```bash
# Disk space
df -h

# Memory
free -h

# Docker daemon
sudo systemctl status docker
```

### 2. Nuclear Option: Full Reset

**WARNING**: This deletes all data. Only use if you have backups.

```bash
# 1. Stop everything
docker compose down

# 2. Remove containers and volumes
docker compose down -v

# 3. Restore database from backup
cp data/gthanks.db.backup-YYYYMMDD data/gthanks.db

# 4. Pull specific version
docker pull greirson/gthanks:v0.0.1

# 5. Update docker-compose.yml to pin version

# 6. Start fresh
docker compose up -d
```

### 3. Contact Support

If all else fails:

- Check GitHub issues: https://github.com/greirson/gthanks/issues
- Review deployment logs
- Check Docker daemon logs: `sudo journalctl -u docker -n 100`

---

## Best Practices

### 1. Tag Every Deployment

Always deploy with version tags, never `latest`:

```bash
# ✅ Good
docker build -t greirson/gthanks:v0.0.2 .
docker push greirson/gthanks:v0.0.2

# ❌ Avoid
docker build -t greirson/gthanks:latest .
```

### 2. Backup Before Every Deployment

```bash
# Create pre-deployment backup script
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d-%H%M%S)

# Backup database
cp data/gthanks.db data/gthanks.db.backup-$DATE

# Backup uploads
tar -czf uploads-backup-$DATE.tar.gz uploads/

# Backup environment
cp .env .env.backup-$DATE

echo "Backup complete: $DATE"
```

### 3. Test Rollback Procedures

Periodically test your rollback process in a staging environment:

```bash
# Deploy new version
docker compose down
# Edit docker-compose.yml to use v0.0.2
docker compose up -d

# Test rollback
docker compose down
# Edit docker-compose.yml back to v0.0.1
docker compose up -d
```

### 4. Keep Rollback Notes

Document each deployment and rollback:

```bash
# deployment-log.md

## 2025-11-24: Deployment v0.0.2
- Deployed at: 14:30 UTC
- Changes: Added gift cards feature
- Database migrations: Yes (added gift_cards table)
- Rollback tested: Yes

## 2025-11-24: Rollback to v0.0.1
- Rolled back at: 15:45 UTC
- Reason: Database migration issue
- Steps taken: Restored database from backup-20251124-143000
- Result: Successful
```

---

## Quick Command Reference

```bash
# List images
docker images greirson/gthanks

# Stop deployment
docker compose down

# Pull specific version
docker pull greirson/gthanks:v0.0.1

# Start deployment
docker compose up -d

# View logs
docker compose logs -f app

# Check health
curl http://localhost:3000/api/health

# Backup database (SQLite)
cp data/gthanks.db data/gthanks.db.backup-$(date +%Y%m%d-%H%M%S)

# Backup database (PostgreSQL)
docker exec gthanks-postgres pg_dump -U gthanks gthanks > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore database (SQLite)
cp data/gthanks.db.backup-YYYYMMDD-HHMMSS data/gthanks.db

# Restore database (PostgreSQL)
cat backup-YYYYMMDD-HHMMSS.sql | docker exec -i gthanks-postgres psql -U gthanks gthanks
```

---

**Last Updated:** 2025-11-24
**Status:** Production-ready ✅
