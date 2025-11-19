# Development Workflow Guide

## Branch Strategy Overview

gthanks uses a three-branch strategy for controlled deployment and testing:

```
production (main) ──────────────────────────────────────────►
     ↑                                                        (Live users)
     └─── staging ──────────────────────────────────────►
               ↑                                              (Beta testing)
               └─── dev ──────────────────────────────►
                         ↑                                    (Active development)
                         └─── feature/* branches
```

### Branch Purposes

| Branch | Purpose | Protected | Deploys To |
|--------|---------|-----------|------------|
| **production** | Live production code | Yes | Production Docker/Vercel |
| **staging** | Pre-release testing | Yes | Staging environment |
| **dev** | Integration branch | Yes | Dev environment (optional) |
| **feature/*** | Active development | No | Local only |

---

## Daily Development Workflow

### 1. Start a New Feature

```bash
# Update dev branch
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/add-wish-templates
```

**Branch Naming Conventions:**

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/short-description` | `feature/wish-templates` |
| Bug Fix | `fix/issue-description` | `fix/reservation-email-bug` |
| Hotfix | `hotfix/critical-issue` | `hotfix/auth-bypass` |
| Refactor | `refactor/component-name` | `refactor/wish-service` |
| Docs | `docs/topic` | `docs/deployment-guide` |

### 2. Develop Locally

```bash
# Start development server
pnpm dev

# Run tests frequently
pnpm test                  # Unit tests
pnpm test:integration      # Integration tests
pnpm test:e2e              # E2E tests (before PR)

# Check code quality
pnpm lint                  # ESLint
pnpm typecheck             # TypeScript
pnpm format                # Prettier
```

### 3. Commit Your Changes

**Pre-Commit Checks (Automatic):**

When you commit, the following checks run automatically:
1. **lint-staged** - Auto-fixes formatting and lint issues on changed files
2. **TypeScript type check** - Ensures no type errors exist
3. **ESLint** - Ensures no linting errors exist

If any check fails, the commit will be blocked. Fix the errors and try again.

**Bypassing Pre-Commit Checks (Emergency Only):**

```bash
# Only use in emergencies (hotfixes, deployment blockers)
git commit --no-verify -m "hotfix: critical production fix"

# Note: You must still fix the errors before creating a PR
# CI/CD will catch the issues if you bypass locally
```

**Commit Message Format:**

```
<type>: <short description>

<optional detailed description>

<optional breaking changes or notes>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `docs:` - Documentation changes
- `chore:` - Build/tooling changes

**Examples:**
```bash
git commit -m "feat: add wish template system"
git commit -m "fix: resolve reservation email duplicate bug"
git commit -m "refactor: extract permission logic to service layer"
```

### 4. Push Feature Branch

```bash
# Push to remote
git push origin feature/add-wish-templates
```

### 5. Create Pull Request

```bash
# Via GitHub CLI (recommended)
gh pr create --base dev --title "Add wish template system" --fill

# Or visit GitHub and create PR manually
```

**PR Checklist (see template):**
- [ ] All tests pass (`pnpm test:all` + `pnpm test:e2e`)
- [ ] Code linted (`pnpm lint:strict`)
- [ ] TypeScript passes (`pnpm typecheck`)
- [ ] Service layer compliance (`pnpm lint:service-layer`)
- [ ] E2E tests updated (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] Database migrations documented (if applicable)

### 6. Code Review

**For Reviewers:**
1. Check test coverage
2. Verify service layer compliance (no direct DB access in API routes)
3. Review permission checks (using `permissionService`)
4. Test locally if significant changes
5. Approve or request changes

**For Authors:**
1. Address feedback
2. Push updates to feature branch
3. Re-request review when ready

### 7. Merge to Dev

Once approved:

```bash
# Merge via GitHub UI (creates merge commit)
# OR via CLI
gh pr merge --merge

# Delete feature branch
git branch -d feature/add-wish-templates
git push origin --delete feature/add-wish-templates
```

---

## Release Workflow (Dev → Staging → Production)

### Phase 1: Dev → Staging (Weekly/Bi-Weekly)

**When:** Every 1-2 weeks, or when major features are ready for beta testing

```bash
# 1. Create release PR
git checkout staging
git pull origin staging

git checkout -b release/v0.2.0
git merge dev

# 2. Update version
npm version patch  # or minor, or major
git push origin release/v0.2.0

# 3. Create PR to staging
gh pr create --base staging --title "Release v0.2.0 to Staging" --body "$(cat <<EOF
## Release Notes

### New Features
- Wish template system
- Bulk wish import

### Bug Fixes
- Fixed reservation email duplicates
- Resolved list sharing permission bug

### Database Changes
- None

### Testing Checklist
- [ ] Health check passes
- [ ] Authentication works
- [ ] Wish CRUD operations
- [ ] List sharing
- [ ] Group management
- [ ] Reservation system
EOF
)"

# 4. After approval, merge to staging
gh pr merge --merge
```

**Post-Deploy to Staging:**

1. Run automated smoke tests
2. Notify beta testers
3. Monitor logs for errors
4. Verify all features work in staging

**Staging Bake Time:** Minimum 3 days before promoting to production

### Phase 2: Staging → Production (After Bake Time)

**Prerequisites:**
- [ ] Staging bake time completed (3+ days)
- [ ] No critical bugs reported by beta testers
- [ ] All smoke tests pass
- [ ] Performance metrics acceptable
- [ ] Database backups confirmed

```bash
# 1. Create production release PR
git checkout production
git pull origin production

git checkout -b release/v0.2.0-production
git merge staging

# 2. Create PR to production
gh pr create --base production --title "Release v0.2.0 to Production" --body "$(cat <<EOF
## Production Release v0.2.0

### Staging Performance
- Uptime: 100%
- Error rate: 0.01%
- P95 response time: 450ms
- Beta tester feedback: Positive

### New Features
- Wish template system
- Bulk wish import

### Bug Fixes
- Fixed reservation email duplicates
- Resolved list sharing permission bug

### Database Migrations
- None (or describe migrations)

### Rollback Plan
- Previous version: v0.1.9
- Rollback command: git revert --no-commit [commit-hash]

### Post-Deploy Verification
- [ ] Health check passes
- [ ] User login works
- [ ] Critical paths tested (see POST_DEPLOY_CHECKLIST.md)
EOF
)"

# 3. After approval, merge to production
gh pr merge --merge

# 4. Tag release
git checkout production
git pull origin production
git tag -a v0.2.0 -m "Release v0.2.0: Wish templates and bulk import"
git push origin v0.2.0
```

**Post-Deploy to Production:**

Follow [POST_DEPLOY_CHECKLIST.md](./POST_DEPLOY_CHECKLIST.md) immediately after deployment.

---

## Hotfix Workflow (Emergency Production Fixes)

**When:** Critical bug in production that cannot wait for normal release cycle

```bash
# 1. Create hotfix branch from production
git checkout production
git pull origin production
git checkout -b hotfix/auth-bypass-fix

# 2. Make minimal fix
# (Edit only the files needed to fix the critical issue)

# 3. Test thoroughly
pnpm test:all
pnpm test:e2e

# 4. Commit with descriptive message
git commit -m "hotfix: patch authentication bypass vulnerability"

# 5. Create PR to production (URGENT)
gh pr create --base production --title "HOTFIX: Auth Bypass Vulnerability" --body "$(cat <<EOF
## CRITICAL HOTFIX

### Issue
Authentication bypass allowing unauthenticated access to user data

### Root Cause
Missing auth check in /api/wishes/[id]/route.ts

### Fix
Added auth validation before data access

### Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] E2E auth tests pass
- [x] Manual verification on local

### Rollback Plan
Revert commit [commit-hash] if issues arise

### Post-Deploy Verification
- [ ] Health check passes
- [ ] Authentication required for all protected routes
- [ ] No unauthorized data access possible
EOF
)"

# 6. After expedited review, merge to production
gh pr merge --merge

# 7. Tag hotfix
git checkout production
git pull origin production
git tag -a v0.2.1 -m "Hotfix v0.2.1: Auth bypass patch"
git push origin v0.2.1

# 8. Back-merge to staging and dev
git checkout staging
git pull origin staging
git merge production
git push origin staging

git checkout dev
git pull origin dev
git merge staging
git push origin dev

# 9. Delete hotfix branch
git branch -d hotfix/auth-bypass-fix
git push origin --delete hotfix/auth-bypass-fix
```

**Hotfix Best Practices:**
- Keep changes minimal (only fix the critical issue)
- Test thoroughly before deploying
- Document the issue and fix clearly
- Back-merge to staging and dev immediately
- Post-mortem: Why did this reach production? How to prevent?

---

## Code Review Guidelines

### For Authors

**Before Creating PR:**
1. Self-review your changes
2. Run all tests locally
3. Check for console errors/warnings
4. Verify mobile responsiveness (375px minimum)
5. Update documentation if needed

**During Review:**
1. Respond to feedback promptly
2. Ask questions if feedback is unclear
3. Push updates as new commits (don't force-push)
4. Re-request review after addressing feedback

### For Reviewers

**What to Check:**

1. **Service Layer Compliance**
   - No direct `db` imports in API routes
   - All permission checks use `permissionService`
   - Bulk operations use service layer

2. **Security**
   - Authentication required for protected endpoints
   - Permission checks before data access
   - Input validation with Zod schemas
   - No SQL injection vulnerabilities
   - No XSS vulnerabilities

3. **Testing**
   - New features have tests
   - Critical paths have E2E tests
   - Edge cases covered

4. **Mobile-First**
   - Works on 375px viewport (iPhone SE)
   - No horizontal scrolling
   - Touch targets 44x44px minimum

5. **User Experience**
   - Passes "Grandma Test" (non-technical users understand)
   - Plain English, no jargon
   - Helpful error messages

6. **Performance**
   - No n+1 query problems
   - Pagination for large datasets
   - Rate limiting on sensitive endpoints

**Review Response Time:**
- Normal PRs: Within 24 hours
- Hotfixes: Within 2 hours
- Blocking PRs: Within 4 hours

---

## Testing Requirements

### Before Creating PR

**Required:**
```bash
pnpm test                  # Unit tests
pnpm test:integration      # Integration tests
pnpm lint:strict           # Zero warnings
pnpm typecheck             # TypeScript checks
pnpm lint:service-layer    # Service layer compliance
```

**Recommended:**
```bash
pnpm test:e2e              # E2E tests (if UI changes)
pnpm build                 # Verify build succeeds
```

### Test Coverage Requirements

| Code Type | Minimum Coverage |
|-----------|-----------------|
| Service layer | 80% |
| Utility functions | 80% |
| API routes | 70% |
| Components | 60% |

**Critical paths must have 100% coverage:**
- Authentication
- Permission checks
- Reservation system
- Bulk delete operations

---

## Database Migrations

### Development (SQLite)

```bash
# Make schema changes in prisma/schema.prisma
# Push changes to dev database
pnpm db:push

# Verify in Prisma Studio
pnpm db:studio
```

### Production (PostgreSQL)

**Before Deploying:**

1. **Document Migration in PR:**
   ```markdown
   ## Database Changes

   ### Schema Changes
   - Added `wishTemplate` table
   - Added `templateId` field to `Wish` table

   ### Data Migration Required
   No data migration needed (new feature)

   ### Rollback Plan
   Remove `templateId` field, drop `wishTemplate` table
   ```

2. **Test Migration Locally:**
   ```bash
   # Switch to PostgreSQL locally
   DATABASE_URL=postgresql://... pnpm db:push
   ```

3. **Backup Production Database:**
   ```bash
   # See DOCKER_DEPLOYMENT.md for backup commands
   ```

4. **Deploy and Monitor:**
   - Deploy code
   - Monitor logs for migration errors
   - Verify schema changes in production

---

## Branch Protection Rules

### Production Branch

- [x] Require pull request reviews (1 minimum)
- [x] Require status checks to pass
- [x] Require branches to be up to date
- [x] Do not allow force pushes
- [x] Do not allow deletions

### Staging Branch

- [x] Require pull request reviews (1 minimum)
- [x] Require status checks to pass
- [x] Allow force pushes (by admins only)

### Dev Branch

- [x] Require pull request reviews (1 minimum)
- [x] Require status checks to pass
- [x] Allow force pushes (by admins only)

---

## Troubleshooting

### Pre-Commit Hook Failures

**TypeScript Errors:**
```bash
# See all type errors
pnpm typecheck

# Fix each error manually
# Common issues:
# - Missing type annotations
# - Type mismatches
# - Import errors
```

**ESLint Errors:**
```bash
# Auto-fix issues
pnpm lint:fix

# Check remaining issues
pnpm lint

# Common issues:
# - Unused variables
# - Missing dependencies in useEffect
# - Service layer violations
```

**Emergency Bypass (Use Sparingly):**
```bash
# Only for critical situations
git commit --no-verify -m "hotfix: emergency fix"

# Remember: You must fix errors before PR
```

### PR Checks Failing

**ESLint Errors:**
```bash
pnpm lint:fix              # Auto-fix issues
pnpm lint                  # Check remaining issues
```

**TypeScript Errors:**
```bash
pnpm typecheck             # See all errors
# Fix each error manually
```

**Test Failures:**
```bash
pnpm test --watch          # Run tests in watch mode
# Fix failing tests one by one
```

### Merge Conflicts

```bash
# Update feature branch with latest dev
git checkout feature/my-feature
git fetch origin dev
git merge origin/dev

# Resolve conflicts manually
# Then commit
git commit -m "chore: resolve merge conflicts"
git push origin feature/my-feature
```

### Accidental Commit to Wrong Branch

```bash
# If committed to dev instead of feature branch
git checkout dev
git reset --soft HEAD~1    # Undo commit, keep changes
git stash                  # Stash changes

git checkout -b feature/my-feature
git stash pop              # Apply changes
git commit -m "feat: my feature"
git push origin feature/my-feature
```

---

## Quick Command Reference

```bash
# Start new feature
git checkout dev && git pull origin dev
git checkout -b feature/my-feature

# Daily development
pnpm dev                   # Start dev server
pnpm test:watch            # Run tests in watch mode
pnpm lint                  # Check code quality

# Before PR
pnpm test:all              # All tests
pnpm test:e2e              # E2E tests
pnpm lint:strict           # Zero warnings
pnpm typecheck             # TypeScript

# Create PR
gh pr create --base dev --fill

# After PR merged
git checkout dev && git pull origin dev
git branch -d feature/my-feature
```

---

## Resources

- [Quick Reference](./QUICK_REFERENCE.md) - One-page cheat sheet
- [Post-Deploy Checklist](./POST_DEPLOY_CHECKLIST.md) - Verification steps
- [Secrets Management](./SECRETS_MANAGEMENT.md) - Environment variables
- [Docker Deployment](./DOCKER_DEPLOYMENT.md) - Deployment guide
- [Testing Strategy](./.claude/guides/testing.md) - Testing guidelines

---

**Last Updated:** 2025-11-17
**Status:** Production-ready
