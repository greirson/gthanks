# Production Branch Strategy & Deployment Safety Plan

## Overview

This plan protects your production beta running via `docker-compose.yml` on a remote server while enabling safe, iterative development.

---

## BRANCH STRUCTURE

```
production  (protected)  ← Production server deploys from here
    ↑
    | PR + Approval
    |
staging     (protected)  ← Pre-production testing
    ↑
    | PR + CI checks
    |
dev         (default)    ← Active development
    ↑
    | PR + CI checks
    |
feature/*   hotfix/*    bugfix/*
```

**Branch Purposes:**
- **production**: Always reflects current production state, protected from direct pushes
- **staging**: Pre-production testing environment, integration branch before production
- **dev**: Main development branch, default for new work
- **feature/**: New features (branch from dev)
- **bugfix/**: Bug fixes (branch from dev)
- **hotfix/**: Emergency production fixes (branch from production)

---

## IMPLEMENTATION ROADMAP

### PHASE 1: IMMEDIATE PROTECTION (Today - CRITICAL)

**Time:** ~1.5 hours | **Priority:** BLOCKING - Must complete before any production deployments

#### Step 1.1: Create Branch Structure (30 minutes)

```bash
# On your local machine
cd /Users/greir/projects/gthanks-dev

# Create branches
git checkout main
git branch production
git branch staging
git branch dev
git push -u origin production staging dev

# Set dev as default branch on GitHub
# (Manual: Settings → Branches → Default branch → dev)
```

#### Step 1.2: Protect Branches on GitHub (15 minutes)

**GitHub Settings → Branches → Add rule for `production`:**

- [x] Require pull request before merging
- [x] Require approvals: 1 (can be yourself for now)
- [x] Require status checks to pass before merging
  - [x] CI build
  - [x] Tests (unit + integration)
  - [x] Linting
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings
- [x] Restrict who can push to matching branches (admins only)

**Repeat for `staging` branch:**
- [x] Require status checks to pass before merging
  - [x] CI build
  - [x] Tests
  - [x] Linting
- [ ] No approval required (faster than production)

**For `dev` branch:**
- [x] Require status checks to pass before merging
  - [x] CI build
  - [x] Tests
- [ ] No approval required (fastest iteration)

#### Step 1.3: Update Production Server (30 minutes)

```bash
# SSH to production server
ssh production-server

# Navigate to gthanks directory
cd /path/to/gthanks

# Switch to production branch
git fetch origin
git checkout production
git pull origin production

# Verify current state
git log -1 --oneline
docker compose ps
```

#### Step 1.4: Create Required Directories (5 minutes)

```bash
# On production server
mkdir -p data/backups logs

# On local machine
mkdir -p scripts .github/workflows docs
```

---

### PHASE 2: CI/CD AUTOMATION (Day 2-3)

**Time:** ~2 hours | **Priority:** HIGH - Enables automated safety checks

#### Step 2.1: GitHub Actions Workflow (1 hour)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [dev, staging, production]
  push:
    branches: [dev, staging, production]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: gthanks_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run linting
        run: pnpm lint:strict

      - name: Run type checking
        run: pnpm typecheck

      - name: Run unit tests
        run: pnpm test

      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/gthanks_test

      - name: Run E2E smoke tests
        run: pnpm test:e2e:smoke
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/gthanks_test
          NEXTAUTH_SECRET: test-secret-32-chars-minimum-length
          NEXTAUTH_URL: http://localhost:3000

      - name: Build production
        run: pnpm build
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/gthanks_test
          NEXTAUTH_SECRET: test-secret-32-chars-minimum-length

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security audit
        run: |
          npm install -g pnpm
          pnpm install
          pnpm audit --audit-level=moderate
```

#### Step 2.2: Database Migration Safety Check (30 minutes)

Create `.github/workflows/migration-check.yml`:

```yaml
name: Database Migration Check

on:
  pull_request:
    branches: [staging, production]
    paths:
      - 'prisma/schema.prisma'

jobs:
  migration-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for breaking schema changes
        run: |
          echo "Checking for breaking database changes..."
          git diff origin/${{ github.base_ref }} HEAD -- prisma/schema.prisma > schema-diff.txt

          # Check for dangerous patterns
          if grep -E "(onDelete:|DropColumn|DropTable|AlterColumn)" schema-diff.txt; then
            echo "WARNING: Detected potentially breaking schema changes!"
            echo "Please review migration carefully and ensure:"
            echo "  - Backup strategy is in place"
            echo "  - Migration is tested on staging"
            echo "  - Rollback plan documented"
            exit 1
          fi

      - name: Validate Prisma schema
        run: |
          npm install -g pnpm
          pnpm install
          pnpm prisma validate
```

#### Step 2.3: Pull Request Template (15 minutes)

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Deployment Checklist

### Pre-Merge
- [ ] All tests passing (unit + integration + E2E)
- [ ] Linting passes
- [ ] Database migrations tested (if applicable)
- [ ] Tested locally with production-like data
- [ ] Breaking changes documented
- [ ] Monitoring alerts reviewed (if applicable)

### Deployment Type
- [ ] Feature (new functionality)
- [ ] Bug fix
- [ ] Hotfix (urgent production issue)
- [ ] Database migration (requires special handling)

### Database Migrations (if applicable)
- [ ] Migration tested on staging database
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented
- [ ] Migration is backward-compatible (if possible)

### Post-Deploy
- [ ] Health check passes (`/api/health`)
- [ ] Smoke tests passed (auth, wish creation, list viewing)
- [ ] No error spikes in logs
- [ ] Database integrity verified
```

---

### PHASE 3: AUTOMATION SCRIPTS (Week 1)

**Time:** ~5 hours | **Priority:** MEDIUM - Needed before first release cycle

#### Step 3.1: Production Deployment Script (1 hour)

Create `scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

VERSION=$(git describe --tags --always)
echo "Deploying gthanks $VERSION to production..."

# Pull latest production code
git fetch origin
git checkout production
git pull origin production

# Backup database BEFORE deployment
echo "Backing up database..."
./scripts/backup-database.sh

# Rebuild and restart containers
echo "Rebuilding containers..."
docker compose down
docker compose build
docker compose up -d

# Wait for services to start
echo "Waiting for health check..."
sleep 10
./scripts/health-check.sh

echo "Deployment complete!"
echo "Version deployed: $VERSION"
docker compose ps
```

Make executable:
```bash
chmod +x scripts/deploy.sh
```

#### Step 3.2: Database Backup Script (30 minutes)

Create `scripts/backup-database.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="data/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_FILE="data/gthanks.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database..."
cp "$DB_FILE" "$BACKUP_DIR/gthanks-$TIMESTAMP.db"

# Keep only last 30 backups (delete older)
echo "Cleaning up old backups..."
ls -t "$BACKUP_DIR"/gthanks-*.db | tail -n +31 | xargs -r rm

echo "Backup complete: $BACKUP_DIR/gthanks-$TIMESTAMP.db"
ls -lh "$BACKUP_DIR" | tail -5
```

Make executable:
```bash
chmod +x scripts/backup-database.sh
```

**Automate with cron (on production server):**
```bash
# SSH to production server
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/gthanks && ./scripts/backup-database.sh >> logs/backup.log 2>&1
```

#### Step 3.3: Rollback Script (30 minutes)

Create `scripts/rollback.sh`:

```bash
#!/bin/bash
set -e

echo "WARNING: ROLLBACK INITIATED"
echo "This will revert to the previous deployment"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled"
  exit 1
fi

# Get previous commit
CURRENT_COMMIT=$(git rev-parse HEAD)
PREVIOUS_COMMIT=$(git rev-parse HEAD~1)

echo "Current commit: $CURRENT_COMMIT"
echo "Rolling back to: $PREVIOUS_COMMIT"

# Revert to previous commit
git checkout "$PREVIOUS_COMMIT"

# Rebuild containers
echo "Rebuilding containers..."
docker compose down
docker compose build
docker compose up -d

echo "Rollback complete!"
echo "Remember to:"
echo "  1. Verify application is working"
echo "  2. Restore database if needed: cp data/backups/gthanks-TIMESTAMP.db data/gthanks.db"
echo "  3. Create hotfix branch to properly fix the issue"
```

Make executable:
```bash
chmod +x scripts/rollback.sh
```

#### Step 3.4: Health Check Script (30 minutes)

Create `scripts/health-check.sh`:

```bash
#!/bin/bash
set -e

HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"

echo "Health Check: $HEALTH_URL"

# Check health endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "Health check passed"
  echo "$BODY" | jq .
else
  echo "Health check failed (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

# Check database connectivity
if echo "$BODY" | jq -e '.database == true' > /dev/null; then
  echo "Database connected"
else
  echo "Database connection failed"
  exit 1
fi

# Check disk space
DISK_USAGE=$(df -h data/ | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "WARNING: Disk usage at ${DISK_USAGE}%"
  exit 1
else
  echo "Disk usage: ${DISK_USAGE}%"
fi

# Check container status
CONTAINERS=$(docker compose ps -q)
RUNNING=$(docker compose ps -q | wc -l)
if [ "$RUNNING" -eq 0 ]; then
  echo "No containers running!"
  exit 1
else
  echo "Containers running: $RUNNING"
fi

echo "All checks passed!"
```

Make executable:
```bash
chmod +x scripts/health-check.sh
```

**Automate with cron (on production server):**
```bash
# SSH to production server
crontab -e

# Add health check every 5 minutes
*/5 * * * * cd /path/to/gthanks && ./scripts/health-check.sh >> logs/health.log 2>&1
```

#### Step 3.5: Documentation (2 hours)

Create `docs/DEVELOPMENT_WORKFLOW.md`:

```markdown
# Development Workflow

## Daily Development

### 1. Create Feature Branch

```bash
# Always branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/add-wish-tagging
```

Branch naming conventions:
- `feature/description` - New features
- `bugfix/issue-number-description` - Bug fixes
- `chore/description` - Non-functional changes (refactoring, docs)

### 2. Develop and Test Locally

```bash
# Make changes
# Run tests continuously
pnpm test:watch

# Before committing
pnpm lint
pnpm typecheck
pnpm test:all
```

### 3. Create Pull Request to `dev`

```bash
git push -u origin feature/add-wish-tagging
# Create PR on GitHub: feature/add-wish-tagging → dev
```

**PR Description should include:**
- What changed and why
- How to test
- Database migrations (if any)
- Breaking changes (if any)

### 4. After PR Approval

```bash
# Squash and merge to dev
# Delete feature branch
git checkout dev
git pull origin dev
git branch -d feature/add-wish-tagging
```

---

## Releasing to Staging

When dev branch is stable and ready for pre-production testing:

```bash
# Create PR: dev → staging
# Title: "Release YYYY-MM-DD - [Brief description]"
# Include:
# - List of features/fixes included
# - Database migrations (if any)
# - Testing checklist
```

**Staging Deploy (if staging server exists):**
- Merging to `staging` triggers auto-deploy
- Perform manual smoke tests
- Monitor logs for errors

---

## Promoting to Production

Only promote from `staging` to `production` after thorough testing:

```bash
# Create PR: staging → production
# Title: "Production Release YYYY-MM-DD v1.X.X"
# Include:
# - Full changelog
# - Database migration plan
# - Rollback plan
# - Post-deploy verification steps
```

**Manual Production Deploy:**

```bash
# SSH to production server
ssh user@production-server

# Run deployment script
cd /path/to/gthanks
./deploy.sh

# Verify deployment
docker compose ps
curl http://localhost:3000/api/health
docker compose logs --tail=50

# Monitor for 15 minutes
docker compose logs -f
```

---

## Hotfix Workflow (Emergency Production Fixes)

When production has a critical bug that can't wait for normal release cycle:

### 1. Create Hotfix Branch from Production

```bash
git checkout production
git pull origin production
git checkout -b hotfix/fix-auth-redirect-loop
```

### 2. Fix and Test

```bash
# Make minimal changes to fix the issue
# Test thoroughly locally

pnpm test:all
pnpm build
```

### 3. Create Hotfix PR to Production

```bash
git push -u origin hotfix/fix-auth-redirect-loop
# Create PR: hotfix/fix-auth-redirect-loop → production
# Mark as URGENT
```

**Hotfix PR Requirements:**
- Minimal code changes (only what's needed for the fix)
- All tests passing
- Tested against production-like data
- Rollback plan documented

### 4. After Hotfix Deploy

**Merge hotfix back to dev and staging:**

```bash
# Ensure hotfix changes propagate to other branches
git checkout dev
git merge hotfix/fix-auth-redirect-loop
git push origin dev

git checkout staging
git merge hotfix/fix-auth-redirect-loop
git push origin staging

# Delete hotfix branch
git branch -d hotfix/fix-auth-redirect-loop
git push origin --delete hotfix/fix-auth-redirect-loop
```
```

Create `docs/QUICK_REFERENCE.md`:

```markdown
# gthanks Git Workflow - Quick Reference

## Daily Development

```bash
# Start new feature
git checkout dev && git pull
git checkout -b feature/my-feature

# Before committing
pnpm lint && pnpm typecheck && pnpm test:all

# Create PR to dev
git push -u origin feature/my-feature
# PR: feature/my-feature → dev
```

## Release to Staging

```bash
# PR: dev → staging
# Title: "Release YYYY-MM-DD"
```

## Deploy to Production

```bash
# PR: staging → production
# Title: "Production Release v1.X.X"

# After merge, SSH to server:
ssh production-server
cd /path/to/gthanks
./deploy.sh

# Verify
./scripts/health-check.sh
```

## Emergency Hotfix

```bash
git checkout production && git pull
git checkout -b hotfix/fix-critical-bug

# Fix, test, commit
pnpm test:all

# PR: hotfix/fix-critical-bug → production (URGENT)

# After deploy, merge back:
git checkout dev && git merge hotfix/fix-critical-bug
git checkout staging && git merge hotfix/fix-critical-bug
```

## Rollback

```bash
# On production server
ssh production-server
cd /path/to/gthanks
./scripts/rollback.sh
```

## Useful Commands

```bash
# Health check
./scripts/health-check.sh

# View logs
docker compose logs -f --tail=100

# Database backup
./scripts/backup-database.sh

# Container status
docker compose ps

# Restart containers
docker compose restart
```
```

Create `docs/POST_DEPLOY_CHECKLIST.md`:

```markdown
# Post-Deployment Verification

Run these checks immediately after every production deployment.

## Automated Checks (5 minutes)

```bash
# 1. Health check
./scripts/health-check.sh

# 2. Container status
docker compose ps

# 3. Recent logs (check for errors)
docker compose logs --tail=100 | grep -i error
```

## Manual Smoke Tests (10 minutes)

- [ ] Homepage loads (https://gthanks.yourdomain.com)
- [ ] Login works (test magic link or OAuth)
- [ ] Create new wish
- [ ] Edit existing wish
- [ ] Create new list
- [ ] Share list (public link)
- [ ] Reserve a wish (as anonymous user)
- [ ] Verify reservation shows up (as list owner)
- [ ] Check email delivery (if SMTP configured)

## Database Integrity (5 minutes)

```bash
# Connect to database
docker compose exec app npx prisma studio

# Verify:
# - Recent wishes visible
# - Recent users visible
# - No orphaned records
```

## Performance Check (5 minutes)

```bash
# Check response times
curl -w "\nTime: %{time_total}s\n" https://gthanks.yourdomain.com/api/health

# Check database size
du -h data/gthanks.db

# Check logs for slow queries
docker compose logs | grep "slow query"
```

## Rollback Decision Point

If any critical issue found:

1. Execute rollback: `./scripts/rollback.sh`
2. Restore database: `cp data/backups/gthanks-TIMESTAMP.db data/gthanks.db`
3. Restart containers: `docker compose restart`
4. Create hotfix branch to fix the issue
```

---

### PHASE 4: STAGING ENVIRONMENT (Week 2 - Optional)

**Time:** 2.5-5 hours | **Priority:** LOW - Nice-to-have, can defer if budget limited

**Option A: Separate Server (Recommended)**

Provision a second server (can be smaller/cheaper):

```bash
# Clone production setup
git clone https://github.com/yourusername/gthanks.git
cd gthanks
git checkout staging

# Use separate database
cp .env.example .env
# Edit .env with staging-specific values
# DATABASE_URL=file:./data/gthanks-staging.db

# Deploy
docker compose up -d
```

**Option B: Same Server, Different Port**

Create `docker-compose.staging.yml`:

```yaml
version: '3.8'

services:
  app-staging:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3001:3000"  # Different port
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/gthanks-staging.db
      - NEXTAUTH_URL=https://staging.gthanks.app
    volumes:
      - ./data-staging:/app/data
      - ./uploads-staging:/app/uploads
    restart: unless-stopped
```

---

## SUCCESS METRICS

### Week 1 (After Setup)
- Zero direct pushes to `production` branch
- All PRs pass CI checks before merge
- Daily backups running automatically
- Health checks running every 5 minutes

### Month 1 (After First Release Cycle)
- At least 3 releases to production
- Zero production incidents from deployment issues
- 100% of PRs reviewed before merge
- Average deployment time < 10 minutes
- CI failure rate < 10%

### Month 3 (Mature Workflow)
- Hotfixes deployed in < 1 hour (from discovery to production)
- Zero database-related incidents
- Team comfortable with workflow (no confusion)
- Deployment frequency: 2-3x per week
- Rollback used 0 times (sign of good testing)

---

## RISK MITIGATION

### Risk: Breaking Production Immediately

**Mitigation:**
- Branch protection prevents direct pushes
- CI checks block bad merges
- Manual approval required for production PRs

**Recovery:**
- Rollback script ready (`./scripts/rollback.sh`)
- Daily backups available
- Previous Docker image tagged

---

### Risk: Slow Development Velocity

**Mitigation:**
- `dev` branch has minimal restrictions (no approval needed)
- CI runs in parallel (< 5 minutes)
- Staging environment optional (can skip initially)

**Recovery:**
- Review CI failures, optimize tests
- Simplify workflow if needed (remove staging if unused)

---

### Risk: Database Migration Failure

**Mitigation:**
- Migration check workflow blocks dangerous changes
- Automated pre-deployment backups
- Rollback script includes database restoration

**Recovery:**
- Restore from backup: `cp data/backups/gthanks-TIMESTAMP.db data/gthanks.db`
- Rollback code: `./scripts/rollback.sh`
- Create hotfix with migration fix

---

## FILES TO CREATE

### Immediate (Day 1)
```
scripts/
├── deploy.sh                 # Production deployment
├── backup-database.sh        # Database backups
├── rollback.sh              # Emergency rollback
└── health-check.sh          # Health monitoring
```

### Day 2-3
```
.github/
├── workflows/
│   ├── ci.yml               # CI/CD pipeline
│   └── migration-check.yml  # Schema change detection
└── PULL_REQUEST_TEMPLATE.md # PR checklist
```

### Week 1
```
docs/
├── DEVELOPMENT_WORKFLOW.md  # Complete workflow guide
├── QUICK_REFERENCE.md       # One-page cheat sheet
└── POST_DEPLOY_CHECKLIST.md # Deployment verification
```

### Week 2 (Optional)
```
docker-compose.staging.yml   # Staging environment
.github/workflows/deploy-staging.yml # Staging auto-deploy
```

---

## QUICK START COMMANDS

### Day 1 Setup (Copy & Paste)

```bash
# 1. Create branches
git checkout main
git branch production && git branch staging && git branch dev
git push -u origin production staging dev

# 2. Create directories
mkdir -p data/backups logs scripts .github/workflows docs

# 3. Create scripts (see Phase 3 for content)
touch scripts/deploy.sh scripts/backup-database.sh scripts/rollback.sh scripts/health-check.sh
chmod +x scripts/*.sh

# 4. Set default branch to 'dev' on GitHub
# (Manual: Settings → Branches → Default branch → dev)

# 5. Protect branches on GitHub
# (Manual: Settings → Branches → Add protection rules)

# 6. Update production server
ssh production-server
cd /path/to/gthanks
git fetch origin && git checkout production && git pull
```

---

## TROUBLESHOOTING

### Branch protection not working?
- Verify you're a repo admin
- Check branch name matches exactly
- Ensure CI checks are enabled in branch protection settings

### CI not running?
- Check `.github/workflows/ci.yml` exists
- Verify GitHub Actions enabled (Settings → Actions)
- Check workflow syntax (YAML is valid)

### Deployment script fails?
- Check file permissions (`chmod +x scripts/deploy.sh`)
- Verify Docker is running
- Check environment variables are set

### Health check fails?
- Verify `/api/health` endpoint exists
- Check containers are running (`docker compose ps`)
- Review logs (`docker compose logs`)

---

## FINAL CHECKLIST

Before considering setup complete:

- [ ] Three branches created (`production`, `staging`, `dev`)
- [ ] Branch protection rules configured on GitHub
- [ ] Default branch set to `dev`
- [ ] Production server switched to `production` branch
- [ ] Deployment script created and tested
- [ ] Backup script created and automated (cron)
- [ ] Rollback script created and tested (dry run)
- [ ] Health check script created and automated
- [ ] CI/CD workflows created and tested
- [ ] PR template created
- [ ] Documentation written (at minimum: QUICK_REFERENCE.md)
- [ ] First release cycle completed successfully

---

## NEXT STEPS

1. **Immediate (Day 1):** Complete critical setup (branches, protection, deployment script)
2. **Day 2-3:** Add CI/CD automation
3. **Week 1:** Document workflow, create automation scripts
4. **Week 2:** (Optional) Set up staging environment
5. **Ongoing:** Follow workflow, monitor metrics, iterate on process

**Key Principle:** Start simple, iterate based on actual needs. The most important thing is protecting production from breaking changes - everything else can be added gradually.
