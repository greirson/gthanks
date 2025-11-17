# gthanks Deployment Scripts

Production-ready automation scripts for deploying, monitoring, and managing the gthanks Docker application.

## Overview

| Script | Purpose | Use Case |
|--------|---------|----------|
| `deploy.sh` | Automated production deployment | Deploy new version to production |
| `backup-database.sh` | Database backup with retention | Manual backups or pre-deployment safety |
| `health-check.sh` | Application health verification | Verify deployment success |
| `rollback.sh` | Emergency rollback procedure | Revert to previous working version |

## Quick Start

### Deploy to Production

```bash
# Deploy with SQLite (default)
./scripts/deploy.sh

# Deploy with PostgreSQL
COMPOSE_FILE=docker-compose.postgres.yml ./scripts/deploy.sh
```

### Backup Database

```bash
# Auto-detect database type
./scripts/backup-database.sh

# Force specific database type
DB_TYPE=postgres ./scripts/backup-database.sh
```

### Health Check

```bash
# Check local deployment
./scripts/health-check.sh

# Check production deployment
HEALTH_URL=https://gthanks.app/api/health ./scripts/health-check.sh
```

### Emergency Rollback

```bash
# Interactive rollback with prompts
./scripts/rollback.sh

# Automated rollback (CI/CD use)
AUTO_CONFIRM=true ./scripts/rollback.sh
```

## Scripts Reference

### deploy.sh

**Purpose**: Automated production deployment with safety checks

**Features**:
- Git version tagging
- Pre-deployment database backup
- Docker image building with version tags
- Container restart with zero-downtime strategy
- Post-deployment health verification

**Environment Variables**:
```bash
COMPOSE_FILE=docker-compose.postgres.yml  # Compose file to use (default: docker-compose.yml)
BRANCH=main                               # Git branch to deploy (default: main)
SKIP_BACKUP=true                          # Skip pre-deployment backup (not recommended)
SKIP_HEALTH_CHECK=true                    # Skip post-deployment health check
```

**Examples**:
```bash
# Standard production deployment
./scripts/deploy.sh

# Deploy PostgreSQL version
COMPOSE_FILE=docker-compose.postgres.yml ./scripts/deploy.sh

# Fast deployment (skip backup - use with caution)
SKIP_BACKUP=true ./scripts/deploy.sh
```

**Exit Codes**:
- `0`: Deployment successful
- `1`: Deployment failed (check logs)

---

### backup-database.sh

**Purpose**: Create timestamped database backups with automatic retention

**Features**:
- Supports SQLite and PostgreSQL
- Automatic compression (PostgreSQL only)
- 30-day retention policy (configurable)
- Validates database existence before backup

**Environment Variables**:
```bash
DB_TYPE=sqlite                # Database type: sqlite or postgres (auto-detected by default)
BACKUP_DIR=data/backups       # Backup directory (default: data/backups)
RETENTION_DAYS=30             # Number of backups to keep (default: 30)
```

**Examples**:
```bash
# Auto-detect database type
./scripts/backup-database.sh

# Backup PostgreSQL explicitly
DB_TYPE=postgres ./scripts/backup-database.sh

# Custom retention (keep 90 days)
RETENTION_DAYS=90 ./scripts/backup-database.sh
```

**Output Files**:
- SQLite: `data/backups/gthanks-YYYYMMDD-HHMMSS.db`
- PostgreSQL: `data/backups/gthanks-YYYYMMDD-HHMMSS.sql.gz`

**Exit Codes**:
- `0`: Backup successful
- `1`: Backup failed (database not found, container not running, etc.)

---

### health-check.sh

**Purpose**: Verify application health and infrastructure status

**Features**:
- HTTP health endpoint verification with retries
- Database connectivity check
- Disk space monitoring (warning at 80%, critical at 90%)
- Container status verification
- JSON response parsing

**Environment Variables**:
```bash
HEALTH_URL=http://localhost:3000/api/health  # Health endpoint URL
MAX_RETRIES=5                                # Number of retry attempts
RETRY_DELAY=3                                # Seconds between retries
```

**Examples**:
```bash
# Check local deployment
./scripts/health-check.sh

# Check production deployment
HEALTH_URL=https://gthanks.app/api/health ./scripts/health-check.sh

# Quick check with fewer retries
MAX_RETRIES=2 RETRY_DELAY=1 ./scripts/health-check.sh
```

**Exit Codes**:
- `0`: All checks passed
- `1`: Health check failed or warnings detected

**Output Example**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 gthanks Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Endpoint:      http://localhost:3000/api/health
Max Retries:   5
Retry Delay:   3s

Attempt 1/5...
✅ Health check passed (HTTP 200)
{
  "status": "ok",
  "timestamp": "2024-11-17T10:30:00.000Z",
  "database": "connected"
}

📊 Additional Checks:

✅ Database: connected
✅ Disk usage: 45%
✅ Containers: 1 running

   Container Status:
   NAME            STATUS
   gthanks-app     Up 2 minutes (healthy)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All checks passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### rollback.sh

**Purpose**: Emergency rollback to previous deployment

**Features**:
- Git-based rollback to previous commit
- Confirmation prompts (can be disabled for automation)
- Database restoration guidance
- Container rebuild and restart
- Clear next-step instructions

**Environment Variables**:
```bash
COMPOSE_FILE=docker-compose.postgres.yml  # Compose file to use
AUTO_CONFIRM=true                         # Skip confirmation prompts (use in CI/CD)
```

**Examples**:
```bash
# Interactive rollback (recommended)
./scripts/rollback.sh

# Automated rollback (CI/CD use)
AUTO_CONFIRM=true ./scripts/rollback.sh

# Rollback PostgreSQL deployment
COMPOSE_FILE=docker-compose.postgres.yml ./scripts/rollback.sh
```

**Manual Database Restoration**:

For safety, database restoration is manual and provides clear instructions:

**SQLite**:
```bash
# 1. Stop containers
docker compose down

# 2. Restore from backup
cp data/backups/gthanks-TIMESTAMP.db data/gthanks.db

# 3. Restart
docker compose up -d
```

**PostgreSQL**:
```bash
# 1. Decompress backup
gunzip data/backups/gthanks-TIMESTAMP.sql.gz

# 2. Restore to database
cat data/backups/gthanks-TIMESTAMP.sql | docker compose exec -T postgres psql -U gthanks gthanks

# 3. Restart containers
docker compose restart
```

**Exit Codes**:
- `0`: Rollback successful
- `1`: Rollback failed or cancelled

---

## Production Workflow

### Normal Deployment

```bash
# 1. Test locally first
pnpm build
pnpm start

# 2. Deploy to production
./scripts/deploy.sh

# 3. Monitor logs
docker compose logs -f gthanks

# 4. Verify health
./scripts/health-check.sh
```

### Emergency Recovery

If deployment fails:

```bash
# 1. Rollback to previous version
./scripts/rollback.sh

# 2. Verify rollback succeeded
./scripts/health-check.sh

# 3. Investigate issue
docker compose logs gthanks

# 4. Create hotfix branch
git checkout -b hotfix/fix-issue

# 5. Fix and redeploy
git commit -m "fix: critical issue"
./scripts/deploy.sh
```

### Regular Backups

Set up cron job for automated backups:

```bash
# Add to crontab (run daily at 2 AM)
0 2 * * * cd /path/to/gthanks && ./scripts/backup-database.sh >> /var/log/gthanks-backup.log 2>&1
```

## Monitoring

### Health Check Automation

Set up uptime monitoring:

```bash
# UptimeRobot: Monitor https://gthanks.app/api/health every 5 minutes

# Or use cron for basic monitoring:
*/5 * * * * /path/to/gthanks/scripts/health-check.sh || /path/to/alert-script.sh
```

### Log Monitoring

Monitor application logs:

```bash
# Follow logs in real-time
docker compose logs -f gthanks

# Filter for errors
docker compose logs gthanks 2>&1 | grep ERROR

# View last 100 lines
docker compose logs --tail=100 gthanks
```

## Troubleshooting

### Deployment Fails During Health Check

**Symptoms**: Deploy completes but health check fails

**Solution**:
```bash
# 1. Check container logs
docker compose logs gthanks

# 2. Manually test health endpoint
curl http://localhost:3000/api/health

# 3. Verify database connectivity
docker compose exec gthanks npx prisma db pull

# 4. If issue persists, rollback
./scripts/rollback.sh
```

### Database Backup Fails

**Symptoms**: Backup script exits with error

**Solution**:
```bash
# SQLite: Verify database exists
ls -lh data/gthanks.db

# PostgreSQL: Check container is running
docker compose ps postgres

# PostgreSQL: Test manual backup
docker compose exec postgres pg_dump -U gthanks gthanks > test-backup.sql
```

### Rollback Leaves Detached HEAD

**Symptoms**: Git status shows "HEAD detached at..."

**Solution**:
```bash
# Return to main branch
git checkout main

# Or create hotfix branch from current state
git checkout -b hotfix/emergency-fix
```

## Best Practices

1. **Always backup before deploying**: The deploy script does this automatically unless `SKIP_BACKUP=true`

2. **Test deployments in staging first**: Use a staging environment with `docker-compose.postgres.yml` before production

3. **Monitor health checks**: Set up external uptime monitoring (UptimeRobot, Better Uptime, etc.)

4. **Keep backups organized**: The 30-day retention policy prevents disk exhaustion

5. **Use version tags**: Git tags make rollbacks easier to identify
   ```bash
   git tag -a v1.0.0 -m "Release 1.0.0"
   git push origin v1.0.0
   ```

6. **Document changes**: Use clear commit messages for easier debugging
   ```bash
   git commit -m "fix: resolve database connection timeout issue"
   ```

7. **Test rollback procedure**: Verify rollback works before you need it in an emergency

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/gthanks
            ./scripts/deploy.sh

      - name: Verify deployment
        run: |
          HEALTH_URL=${{ secrets.PROD_URL }}/api/health ./scripts/health-check.sh
```

## Support

For issues with deployment scripts:

1. Check script output for error messages
2. Review Docker container logs: `docker compose logs`
3. Verify environment variables are set correctly
4. Open GitHub issue with error details

## License

These scripts are part of the gthanks project. See main project LICENSE file.
