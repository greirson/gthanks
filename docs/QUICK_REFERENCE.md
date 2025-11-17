# Git Workflow Quick Reference

One-page cheat sheet for gthanks development workflow.

---

## Branch Structure

```
production (main) ──────────────────► Live users
     ↑
     └── staging ───────────────────► Beta testers (3+ day bake)
              ↑
              └── dev ──────────────► Active development
                       ↑
                       └── feature/* ─► Your work
```

---

## Which Branch Do I Use?

```
┌─────────────────────────────────────────────┐
│ What are you doing?                         │
└─────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    New feature              Critical bug
    or bug fix               in production?
        │                         │
        v                         v
   feature/*              hotfix/emergency-fix
   (from dev)              (from production)
        │                         │
        v                         v
   PR → dev                 PR → production
                            Then back-merge to
                            staging and dev
```

**Quick Decision Tree:**

| Situation | Branch | Base |
|-----------|--------|------|
| Daily work | `feature/name` | `dev` |
| Production bug (can wait) | `fix/name` | `dev` |
| Production bug (urgent) | `hotfix/name` | `production` |
| Weekly release | `release/v1.2.3` | `staging` |
| Production release | `release/v1.2.3-prod` | `production` |

---

## Common Workflows

### Start New Feature

```bash
git checkout dev && git pull origin dev
git checkout -b feature/wish-templates
# ... make changes ...
pnpm test:all && pnpm test:e2e
gh pr create --base dev --fill
```

### Hotfix Production

```bash
git checkout production && git pull origin production
git checkout -b hotfix/auth-bug
# ... fix bug ...
pnpm test:all && pnpm test:e2e
gh pr create --base production --title "HOTFIX: Auth Bug"
# After merge:
git checkout staging && git pull && git merge production && git push
git checkout dev && git pull && git merge staging && git push
```

### Release to Staging

```bash
git checkout staging && git pull origin staging
git checkout -b release/v1.2.0
git merge dev
npm version patch  # or minor/major
gh pr create --base staging --title "Release v1.2.0 to Staging"
# After merge, wait 3+ days before production
```

### Release to Production

```bash
git checkout production && git pull origin production
git checkout -b release/v1.2.0-prod
git merge staging
gh pr create --base production --title "Release v1.2.0 to Production"
# After merge:
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

---

## Testing Commands

| Command | What It Does | When to Run |
|---------|--------------|-------------|
| `pnpm dev` | Start dev server | Always when coding |
| `pnpm test` | Unit tests | Before every commit |
| `pnpm test:watch` | Unit tests (watch) | During development |
| `pnpm test:integration` | Integration tests | Before PR |
| `pnpm test:e2e` | E2E tests | Before PR |
| `pnpm test:all` | Unit + integration | Before PR |
| `pnpm lint` | Check code style | Before PR |
| `pnpm lint:strict` | Zero warnings | Before PR |
| `pnpm typecheck` | TypeScript check | Before PR |
| `pnpm lint:service-layer` | Service compliance | Before PR |
| `pnpm build` | Production build | Before release PR |

---

## Pre-PR Checklist

```bash
# Required (run these before creating PR)
pnpm test:all              # ✓ All tests pass
pnpm test:e2e              # ✓ E2E tests pass (if UI changes)
pnpm lint:strict           # ✓ Zero warnings
pnpm typecheck             # ✓ No TypeScript errors
pnpm lint:service-layer    # ✓ Service layer compliance

# Verify
pnpm build                 # ✓ Build succeeds (optional but recommended)
```

---

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/name` | `feature/wish-templates` |
| Bug fix | `fix/name` | `fix/email-duplicate` |
| Hotfix | `hotfix/name` | `hotfix/auth-bypass` |
| Refactor | `refactor/name` | `refactor/wish-service` |
| Docs | `docs/name` | `docs/deployment` |
| Release | `release/v1.2.3` | `release/v1.2.0` |

---

## Commit Messages

```
<type>: <description>

Types: feat, fix, refactor, test, docs, chore
```

**Examples:**
```bash
git commit -m "feat: add wish template system"
git commit -m "fix: resolve email duplicate bug"
git commit -m "refactor: extract permission logic"
git commit -m "test: add E2E tests for reservations"
git commit -m "docs: update deployment guide"
git commit -m "chore: upgrade dependencies"
```

---

## Emergency Procedures

### Rollback Production

```bash
# Option 1: Revert last commit
git checkout production
git revert HEAD --no-commit
git commit -m "chore: rollback production to v1.1.9"
git push origin production

# Option 2: Revert specific commit
git revert <commit-hash> --no-commit
git commit -m "chore: rollback breaking change"
git push origin production

# Option 3: Reset to tag (destructive)
git reset --hard v1.1.9
git push origin production --force
```

### Fix Broken Build

```bash
# Check what broke
pnpm build 2>&1 | tee build-error.log

# Common fixes
pnpm install               # Missing dependencies
pnpm db:generate           # Prisma client out of sync
pnpm typecheck             # TypeScript errors
pnpm lint:fix              # Auto-fix linting issues
```

### Resolve Merge Conflicts

```bash
git fetch origin dev
git merge origin/dev
# Fix conflicts in editor
git add .
git commit -m "chore: resolve merge conflicts"
git push origin feature/my-feature
```

---

## Docker Deployment

### Start Application

```bash
# SQLite (simple)
docker compose up -d

# PostgreSQL (production)
docker compose -f docker-compose.postgres.yml up -d

# View logs
docker compose logs -f app

# Stop
docker compose down
```

### Update Application

```bash
git pull origin production
docker compose build
docker compose up -d
```

### Database Operations

```bash
# Backup (SQLite)
cp data/gthanks.db backup-$(date +%Y%m%d).db

# Backup (PostgreSQL)
docker exec gthanks-postgres pg_dump -U gthanks gthanks > backup.sql

# Restore (PostgreSQL)
cat backup.sql | docker exec -i gthanks-postgres psql -U gthanks gthanks
```

---

## Health Check

```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response
{
  "database": true,
  "timestamp": "2025-11-17T10:30:00Z"
}

# View logs
docker compose logs --tail=100 app

# Check for errors
docker compose logs app 2>&1 | grep ERROR
```

---

## Database Commands

```bash
# Push schema changes
pnpm db:push

# Open Prisma Studio
pnpm db:studio

# Generate Prisma Client
pnpm db:generate

# Clean database (dev only)
pnpm dev:clean
```

---

## Useful Git Commands

```bash
# View branch graph
git log --oneline --graph --all --decorate

# View what changed
git diff dev                    # Compare current branch to dev
git diff --stat                 # Summary of changes
git show <commit-hash>          # View specific commit

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git reset --hard origin/dev

# Delete local branch
git branch -d feature/my-feature

# Delete remote branch
git push origin --delete feature/my-feature

# View all branches
git branch -a

# View remote branches
git branch -r
```

---

## Monitoring

### Production Logs

```bash
# Docker logs
docker logs gthanks-app --tail=100 --follow

# Filter errors
docker logs gthanks-app 2>&1 | grep ERROR

# Check specific time range
docker logs gthanks-app --since="2025-11-17T10:00:00"
```

### Performance Check

```bash
# Response time
time curl http://localhost:3000/

# Database connectivity
docker compose exec postgres pg_isready -U gthanks

# Disk usage
df -h
docker system df
```

---

## Environment Variables

### Required (All Environments)

```env
DATABASE_URL=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<32-char-random-string>
```

### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32

# Generate PostgreSQL password
openssl rand -base64 48
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests fail | `pnpm install && pnpm db:generate && pnpm test` |
| Build fails | `pnpm build` and check error messages |
| Database locked | Stop dev server, restart: `pnpm dev:clean` |
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` |
| Prisma Client outdated | `pnpm db:generate` |
| Can't push to branch | Branch protected, create PR instead |
| Merge conflicts | See "Resolve Merge Conflicts" above |

---

## Resources

- [Full Workflow Guide](./DEVELOPMENT_WORKFLOW.md)
- [Post-Deploy Checklist](./POST_DEPLOY_CHECKLIST.md)
- [Secrets Management](./SECRETS_MANAGEMENT.md)
- [Docker Deployment](./DOCKER_DEPLOYMENT.md)
- [Database Migration](./DATABASE_MIGRATION.md)

---

**Print this page for quick reference at your desk!**

**Last Updated:** 2025-11-17
