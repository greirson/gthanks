# Post-Deploy Verification Checklist

Run this checklist immediately after deploying to staging or production.

---

## Quick Health Check (2 minutes)

Run these checks immediately after deployment:

```bash
# 1. Health endpoint
curl https://your-domain.com/api/health

# Expected response:
{
  "database": true,
  "timestamp": "2025-11-17T10:30:00Z"
}

# 2. Application responds
curl -I https://your-domain.com

# Expected: HTTP 200 OK

# 3. No 5xx errors in logs
docker compose logs --tail=100 app | grep -E "5[0-9]{2}" || echo "No 5xx errors"
```

**If any check fails, consider immediate rollback.**

---

## Automated Verification (5 minutes)

### 1. Health Check Script

Save this as `scripts/post-deploy-health.sh`:

```bash
#!/bin/bash

URL="${1:-http://localhost:3000}"
echo "Checking deployment health for: $URL"

# Health endpoint
echo -n "Health endpoint: "
HEALTH=$(curl -s "$URL/api/health")
if echo "$HEALTH" | grep -q '"database":true'; then
  echo "✓ PASS"
else
  echo "✗ FAIL - $HEALTH"
  exit 1
fi

# Homepage loads
echo -n "Homepage loads: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$STATUS" -eq 200 ]; then
  echo "✓ PASS (HTTP $STATUS)"
else
  echo "✗ FAIL (HTTP $STATUS)"
  exit 1
fi

# API responds (unauthenticated)
echo -n "API responds: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/metadata?url=https://example.com")
if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 401 ]; then
  echo "✓ PASS (HTTP $STATUS)"
else
  echo "✗ FAIL (HTTP $STATUS)"
  exit 1
fi

echo ""
echo "All health checks passed! ✓"
```

**Run it:**

```bash
chmod +x scripts/post-deploy-health.sh
./scripts/post-deploy-health.sh https://your-domain.com
```

### 2. Database Connectivity

```bash
# For Docker PostgreSQL
docker compose exec postgres pg_isready -U gthanks

# Expected: accepting connections

# For Docker SQLite
docker compose exec app sh -c "ls -la /app/data/gthanks.db"

# Expected: file exists with recent timestamp
```

### 3. Environment Variables

```bash
# Verify critical env vars are set
docker compose exec app sh -c 'echo $NEXTAUTH_SECRET | wc -c'

# Expected: 44+ characters (32-char base64 + newline)

docker compose exec app sh -c 'echo $DATABASE_URL | head -c 20'

# Expected: postgresql:// or file:
```

---

## Manual Smoke Tests (10 minutes)

Test critical user paths manually to catch issues automated tests might miss.

### 1. Authentication Flow

**Test Case: Sign Up with Email**

1. Visit homepage: `https://your-domain.com`
2. Click "Get Started" or "Sign Up"
3. Enter email: `test+$(date +%s)@example.com`
4. Click "Send Magic Link"
5. Check email inbox (or logs if using SMTP mock)
6. Click magic link
7. Complete username setup
8. Verify redirected to dashboard

**Expected:** User successfully logged in, session cookie set

**If fails:** Check email configuration, NextAuth logs, database connectivity

---

### 2. Wish Management

**Test Case: Create and Edit Wish**

1. Log in (using test account)
2. Navigate to "My Wishes"
3. Click "Create Wish" or "+"
4. Fill form:
   - Title: `Test Wish $(date +%s)`
   - URL: `https://example.com/product`
   - Price: `99.99`
   - Priority: "Really want" (2 stars)
5. Click "Save"
6. Verify wish appears in list
7. Click wish menu → "Edit"
8. Change title to `Updated Test Wish`
9. Click "Save"
10. Verify title updated

**Expected:** Wish created, edited, displays correctly

**If fails:** Check API logs, database connectivity, service layer errors

---

### 3. List Sharing (Public List)

**Test Case: Share Public List**

1. Log in
2. Navigate to "My Lists"
3. Create new list: `Test List $(date +%s)`
4. Add a wish to the list
5. Click list → "Share"
6. Select "Public" visibility
7. Copy share link
8. Open share link in incognito/private browser
9. Verify list visible without login
10. Click "Reserve" on a wish
11. Fill name/email, submit
12. Verify reservation success message

**Expected:** Public list accessible, reservation works for anonymous user

**If fails:** Check permission service, reservation API, email configuration

---

### 4. Group Management

**Test Case: Create Group and Invite Member**

1. Log in
2. Navigate to "Groups"
3. Click "Create Group"
4. Name: `Test Group $(date +%s)`
5. Click "Create"
6. Click group → "Invite Member"
7. Enter email: `member@example.com`
8. Click "Send Invitation"
9. Verify invitation sent (check email or logs)

**Expected:** Group created, invitation sent

**If fails:** Check email configuration, group service, invitation API

---

### 5. Mobile Responsiveness

**Test Case: Mobile Navigation**

1. Open site on mobile device or resize browser to 375px width
2. Navigate to "My Wishes"
3. Verify no horizontal scrolling
4. Click hamburger menu (if present)
5. Verify menu opens
6. Navigate to different pages
7. Verify all touch targets are easily tappable
8. Create a wish using mobile keyboard
9. Verify form inputs work correctly

**Expected:** All features work on mobile viewport

**If fails:** Check responsive CSS, touch target sizes, viewport meta tag

---

## Database Integrity Checks (5 minutes)

### 1. Verify Schema

```bash
# Via Prisma Studio
pnpm prisma studio

# Or via SQL
docker compose exec postgres psql -U gthanks gthanks -c "\dt"

# Expected: 17 tables
# User, UserEmail, Session, Account, VerificationToken, MagicLink,
# Wish, UserPreference, List, Group, ListWish, ListAdmin, ListGroup,
# UserGroup, GroupInvitation, ListInvitation, Reservation
```

### 2. Check for Orphaned Records

```sql
-- Run via Prisma Studio or psql

-- Orphaned wishes (no owner)
SELECT COUNT(*) FROM "Wish" WHERE "ownerId" NOT IN (SELECT id FROM "User");
-- Expected: 0

-- Orphaned reservations (no wish)
SELECT COUNT(*) FROM "Reservation" WHERE "wishId" NOT IN (SELECT id FROM "Wish");
-- Expected: 0

-- Orphaned list wishes (no list)
SELECT COUNT(*) FROM "ListWish" WHERE "listId" NOT IN (SELECT id FROM "List");
-- Expected: 0
```

### 3. Verify Indexes

```sql
-- Check indexes exist
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';

-- Expected: Indexes on all foreign keys and lookup fields
```

---

## Performance Verification (5 minutes)

### 1. Response Time Check

```bash
# Measure response time
time curl https://your-domain.com

# Expected: < 2 seconds for initial page load

# Measure API response time
time curl https://your-domain.com/api/health

# Expected: < 500ms
```

### 2. Database Query Performance

```bash
# Enable query logging (PostgreSQL)
docker compose exec postgres psql -U gthanks gthanks -c "ALTER DATABASE gthanks SET log_statement = 'all';"

# Perform typical operations (create wish, view list, etc.)

# Check for slow queries (> 100ms)
docker compose logs postgres | grep "duration:" | awk '$NF > 100'

# Disable query logging
docker compose exec postgres psql -U gthanks gthanks -c "ALTER DATABASE gthanks SET log_statement = 'none';"
```

### 3. Memory Usage

```bash
# Check container memory usage
docker stats gthanks-app --no-stream

# Expected: < 512MB for normal operation

# If high, check for memory leaks
docker compose logs app | grep -i "memory\|heap"
```

---

## Log Review (5 minutes)

### 1. Check for Errors

```bash
# Last 500 lines
docker compose logs --tail=500 app

# Filter for errors
docker compose logs --tail=1000 app | grep -i "error\|exception\|fail"

# Check for specific error patterns
docker compose logs app | grep -E "(TypeError|ReferenceError|SyntaxError)"
```

### 2. Check for Warnings

```bash
# Authentication warnings
docker compose logs app | grep -i "auth.*warn"

# Database warnings
docker compose logs app | grep -i "prisma.*warn"

# Rate limit warnings (might be normal)
docker compose logs app | grep "Rate limit"
```

### 3. Monitor for Next Hour

```bash
# Follow logs in real-time
docker compose logs -f app

# Watch for:
# - Repeated errors (same error multiple times)
# - 5xx status codes
# - Database connection errors
# - Authentication failures
```

---

## Rollback Decision Criteria

**Rollback immediately if:**

- [ ] Health check fails
- [ ] Database connectivity lost
- [ ] Authentication completely broken (no one can log in)
- [ ] 5xx error rate > 5% of requests
- [ ] Critical feature broken (wish creation, list sharing)
- [ ] Data corruption detected

**Monitor but don't rollback if:**

- [ ] Minor UI bugs (cosmetic issues)
- [ ] Non-critical feature broken (profile images, themes)
- [ ] Rate limiting working as intended (429 errors)
- [ ] Performance slightly slower (but still < 2s page load)

**Rollback Commands:**

```bash
# Option 1: Revert last commit
git checkout production
git revert HEAD --no-commit
git commit -m "chore: rollback production deployment"
git push origin production

# Option 2: Reset to previous tag
git checkout production
git reset --hard v1.1.9
git push origin production --force

# Redeploy
docker compose pull
docker compose up -d
```

---

## Post-Rollback Checklist

If you rolled back:

1. [ ] Run post-deploy checklist again on rolled-back version
2. [ ] Verify health checks pass
3. [ ] Document what went wrong (GitHub issue)
4. [ ] Investigate root cause
5. [ ] Fix issue in dev branch
6. [ ] Re-test thoroughly in staging
7. [ ] Deploy again when ready

---

## Success Criteria

Deployment is successful if all of the following are true:

- [ ] Health endpoint returns 200 OK
- [ ] Database connectivity confirmed
- [ ] Authentication flow works
- [ ] Wish CRUD operations work
- [ ] List sharing works
- [ ] Group management works
- [ ] Reservation system works
- [ ] Mobile responsiveness verified
- [ ] No critical errors in logs
- [ ] Response times acceptable (< 2s page load)
- [ ] Memory usage normal (< 512MB)
- [ ] No data corruption detected

---

## Monitoring After Deployment

Continue monitoring for the next 24 hours:

**First Hour:**

- Check logs every 10 minutes
- Monitor error rate
- Watch for unusual patterns

**First 6 Hours:**

- Check logs hourly
- Monitor user reports (email, support)
- Review Sentry dashboard (if configured)

**First 24 Hours:**

- Check logs every 4 hours
- Monitor performance metrics
- Review user feedback

**If no issues after 24 hours:** Deployment considered stable.

---

## Documentation

After successful deployment:

1. [ ] Update CHANGELOG.md with new version
2. [ ] Tag release in Git (`git tag -a v1.2.0`)
3. [ ] Update deployment date in README
4. [ ] Document any manual steps taken
5. [ ] Post-mortem if anything went wrong

---

## Resources

- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Docker Deployment](./DOCKER_DEPLOYMENT.md)
- [Monitoring Guide](./.claude/guides/monitoring.md)

---

**Print this checklist and check boxes as you verify each item!**

**Last Updated:** 2025-11-17
