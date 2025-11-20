## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the appropriate option with an "x" -->

- [ ] Feature (new functionality)
- [ ] Bug fix (fixes an issue)
- [ ] Hotfix (critical production fix)
- [ ] Refactor (code improvement, no functionality change)
- [ ] Documentation (updates to docs)
- [ ] Chore (build, dependencies, tooling)

## Deployment Target

<!-- Mark the target branch for this PR -->

- [ ] Dev (feature branch → dev)
- [ ] Staging (dev → staging, release candidate)
- [ ] Production (staging → production, final release)

---

## Changes Made

<!-- List the specific changes made in this PR -->

-
-
- ***

## Database Changes

<!-- Mark if this PR includes database migrations -->

- [ ] No database changes
- [ ] Schema changes (new tables, fields, indexes)
- [ ] Data migration required
- [ ] Database rollback plan documented

<details>
<summary>Database Migration Details (if applicable)</summary>

### Schema Changes

<!-- Describe schema changes -->

```prisma
// Example:
model NewTable {
  id String @id @default(cuid())
  // ...
}
```

### Migration Steps

<!-- List steps to apply migration -->

1.
2.

### Rollback Plan

<!-- Describe how to revert database changes -->

1.
2.

</details>

---

## Breaking Changes

<!-- Mark if this PR introduces breaking changes -->

- [ ] No breaking changes
- [ ] Breaking changes (describe below)

<details>
<summary>Breaking Changes Details (if applicable)</summary>

### What breaks?

<!-- Describe what functionality is affected -->

### Migration path for users

<!-- How should users/developers update their code? -->

### Deprecation warnings added?

- [ ] Yes
- [ ] No (explain why)

</details>

---

## Pre-Merge Checklist

### Testing

- [ ] All unit tests pass (`pnpm test`)
- [ ] All integration tests pass (`pnpm test:integration`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] Manual testing completed (list critical paths tested)
- [ ] Mobile testing completed (375px viewport minimum)

<details>
<summary>Manual Test Cases</summary>

<!-- List the manual tests you performed -->

**Test Case 1:**

- Step 1:
- Step 2:
- Expected:
- Actual: ✓ Pass

**Test Case 2:**

- Step 1:
- Expected:
- Actual: ✓ Pass

</details>

### Code Quality

- [ ] Code linted (`pnpm lint:strict`)
- [ ] TypeScript checks pass (`pnpm typecheck`)
- [ ] Service layer compliance verified (`pnpm lint:service-layer`)
- [ ] No console errors or warnings
- [ ] Code formatted (`pnpm format`)

### Security

- [ ] No secrets committed (checked with `git log -p`)
- [ ] Authentication required for protected endpoints
- [ ] Permission checks use `permissionService` (not manual checks)
- [ ] Input validation with Zod schemas
- [ ] Rate limiting applied to sensitive endpoints (if applicable)

### Documentation

- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)
- [ ] Comments added for complex logic
- [ ] Environment variables documented (if new variables added)
- [ ] Database migration documented (if applicable)

### Mobile & Accessibility

- [ ] Tested on 375px viewport (iPhone SE)
- [ ] No horizontal scrolling
- [ ] Touch targets minimum 44x44px
- [ ] Keyboard navigation works
- [ ] Screen reader friendly (proper ARIA labels)
- [ ] Passes "Grandma Test" (non-technical users understand UI)

---

## Post-Deploy Verification

<!-- List the checks you will perform after deployment -->

### Automated Checks

- [ ] Health endpoint responds (`/api/health`)
- [ ] Homepage loads successfully
- [ ] Database connectivity confirmed

### Smoke Tests

- [ ] Authentication flow (login/logout)
- [ ] Wish CRUD operations
- [ ] List sharing
- [ ] Group management (if applicable)
- [ ] Reservation system (if applicable)

### Monitoring

- [ ] Check logs for errors (first 10 minutes)
- [ ] Monitor error rate (first hour)
- [ ] Verify performance metrics (response time < 2s)

<details>
<summary>Post-Deploy Commands</summary>

```bash
# Health check
curl https://your-domain.com/api/health

# View logs
docker compose logs --tail=100 -f app

# Check for errors
docker compose logs app | grep -i error
```

</details>

---

## Rollback Plan

<!-- Describe how to rollback if deployment fails -->

**Rollback trigger:**

- Health check fails
- Authentication broken
- Critical feature broken
- Error rate > 5%

**Rollback commands:**

```bash
# Option 1: Revert commit
git checkout production
git revert HEAD --no-commit
git commit -m "chore: rollback failed deployment"
git push origin production

# Option 2: Reset to previous tag
git reset --hard v1.2.3
git push origin production --force

# Redeploy
docker compose up -d
```

**Post-rollback:**

- [ ] Verify health check passes
- [ ] Run smoke tests
- [ ] Document what went wrong
- [ ] Create GitHub issue for investigation

---

## Related Issues

<!-- Link related GitHub issues -->

Closes #
Fixes #
Relates to #

---

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

### Before

<!-- Screenshot of old UI -->

### After

<!-- Screenshot of new UI -->

### Mobile (375px)

<!-- Screenshot of mobile viewport -->

---

## Additional Notes

<!-- Any additional context, concerns, or questions -->

---

## Reviewer Checklist

<!-- For reviewers to complete -->

### Code Review

- [ ] Code follows project conventions
- [ ] Service layer used correctly (no direct DB access in API routes)
- [ ] Permission checks use `permissionService`
- [ ] Error handling implemented
- [ ] Edge cases considered
- [ ] No obvious security issues

### Testing

- [ ] Test coverage adequate
- [ ] E2E tests cover new functionality
- [ ] Manual testing completed (if UI changes)

### Documentation

- [ ] Code is self-documenting or well-commented
- [ ] API changes documented
- [ ] User-facing changes documented

### Deployment

- [ ] Database migration plan reviewed (if applicable)
- [ ] Rollback plan documented
- [ ] Breaking changes clearly communicated

---

## Approval

<!-- Reviewer: Add approval comment after checking all boxes above -->

**Approved by:** @reviewer
**Date:** YYYY-MM-DD
**Comments:**

---

**Merge checklist (for merger):**

- [ ] All CI checks pass
- [ ] All reviewer comments addressed
- [ ] Required approvals received
- [ ] Branch up to date with target branch
- [ ] Merge strategy: Squash / Merge commit / Rebase

---

**Post-merge:**

- [ ] Delete feature branch
- [ ] Monitor deployment logs
- [ ] Verify post-deploy checklist completed
- [ ] Update project board (if applicable)

---

<!--
Template version: 1.0
Last updated: 2025-11-17
-->
