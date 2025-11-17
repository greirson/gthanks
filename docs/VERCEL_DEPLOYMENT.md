# Vercel Deployment Guide

> **Note:** This guide covers deployment to Vercel. For Docker deployment (recommended for self-hosting), see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md).

## Overview

This guide walks through deploying gthanks to Vercel with PostgreSQL database, email integration, and cron jobs for token cleanup.

## Pre-Deployment Tasks

### 1. Environment Variables (Vercel)

Before deploying to production, ensure all required environment variables are set in Vercel:

```bash
# Check current environment variables
vercel env ls

# Add missing variables (if needed)
vercel env add VARIABLE_NAME
```

**Required Environment Variables:**

| Variable | Description | How to Generate | Required For |
|----------|-------------|-----------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Vercel Postgres / External | All features |
| `NEXTAUTH_URL` | Production URL | `https://your-domain.vercel.app` | Authentication |
| `NEXTAUTH_SECRET` | Auth session encryption key | `openssl rand -base64 32` | Authentication |
| `CRON_SECRET` | Cron job authentication token | `openssl rand -base64 32` | Token cleanup cron |
| `SMTP_HOST` | SMTP server hostname | From email provider | Magic links |
| `SMTP_PORT` | SMTP server port | Usually `587` | Magic links |
| `SMTP_USER` | SMTP username | From email provider | Magic links |
| `SMTP_PASS` | SMTP password | From email provider | Magic links |
| `EMAIL_FROM` | Sender email address | `noreply@your-domain.com` | Magic links |

**Optional OAuth Variables (if using OAuth):**

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Google Cloud Console |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth app ID | [Facebook Developers](https://developers.facebook.com) |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth secret | Facebook Developers |
| `APPLE_ID` | Apple OAuth client ID | [Apple Developer](https://developer.apple.com) |
| `APPLE_SECRET` | Apple OAuth secret | Apple Developer |

---

## Deployment Steps

### Step 1: Generate CRON_SECRET

```bash
# Generate a secure 32-character random string
openssl rand -base64 32
```

**Example output:**
```
zT6X7gIkWiBNFlwerg3kDxuVZWk3JeZjkY2h9VVIetc=
```

Save this value - you'll need it in Step 2.

### Step 2: Add CRON_SECRET to Vercel

**Option A: Via Vercel CLI**

```bash
vercel env add CRON_SECRET
```

When prompted:
- Enter the secret from Step 1
- Select all environments: **Production**, **Preview**, **Development**

**Option B: Via Vercel Dashboard**

1. Go to: `https://vercel.com/[your-team]/[your-project]/settings/environment-variables`
2. Click **"Add New"**
3. Name: `CRON_SECRET`
4. Value: Paste the secret from Step 1
5. Select **all** environments: Production, Preview, Development
6. Click **"Save"**

### Step 3: Verify vercel.json Configuration

The cron job is already configured in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/cleanup-tokens",
    "schedule": "0 0 * * *"
  }]
}
```

**Schedule:** `0 0 * * *` = Daily at midnight UTC

**To change the schedule**, edit `vercel.json` before deploying:

| Schedule | Description |
|----------|-------------|
| `0 0 * * *` | Daily at midnight UTC |
| `0 */6 * * *` | Every 6 hours |
| `0 */12 * * *` | Every 12 hours |
| `0 0 * * 0` | Weekly on Sunday at midnight |

### Step 4: Deploy to Production

```bash
# Ensure all changes are committed
git add -A
git commit -m "feat: production deployment with cron job"

# Push to main branch (triggers Vercel deployment)
git push origin main
```

Vercel will automatically:
1. Deploy the new code
2. Register the cron job from `vercel.json`
3. Add the `Authorization: Bearer {CRON_SECRET}` header to cron requests
4. Execute the job according to the schedule

### Step 5: Verify Deployment

#### A. Check Cron Job in Vercel Dashboard

1. Go to your Vercel project
2. Navigate to **Settings → Cron Jobs**
3. Verify you see:
   - **Path:** `/api/cron/cleanup-tokens`
   - **Schedule:** `0 0 * * *`
   - **Status:** Active ✅

#### B. Monitor Cron Execution Logs

**Via Vercel Dashboard:**

1. Go to **Deployments → [Latest Deployment] → Logs**
2. Filter by `/api/cron/cleanup-tokens`
3. Wait for midnight UTC or manually trigger (if available on your plan)

**Expected log output:**
```
Cleaned up expired tokens: MagicLinks: 5, VerificationTokens: 12
```

**Via Vercel CLI:**

```bash
vercel logs --follow --filter="/api/cron/cleanup-tokens"
```

#### C. Manual Test (Production)

**⚠️ Warning:** Only test if you need immediate verification. The cron will run automatically.

```bash
# Get your production URL
PROD_URL="https://your-app.vercel.app"

# Get your CRON_SECRET from Vercel
CRON_SECRET="your-secret-here"

# Test the endpoint
curl -X GET "$PROD_URL/api/cron/cleanup-tokens" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected response:**
```json
{
  "success": true,
  "deletedMagicLinks": 0,
  "deletedVerificationTokens": 0
}
```

---

## Post-Deployment Monitoring

### Daily Checks (First Week)

Monitor cron execution for the first week to ensure stability:

```bash
# View recent cron logs
vercel logs --filter="/api/cron/cleanup-tokens" --since=24h
```

**What to look for:**
- ✅ Cron executes daily at midnight UTC
- ✅ No 401 Unauthorized errors (indicates CRON_SECRET is correct)
- ✅ Token cleanup counts are reasonable (not too high/low)
- ✅ No database connection errors

### Error Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | CRON_SECRET mismatch | Regenerate secret, update Vercel env vars, redeploy |
| `500 Internal Server Error` | CRON_SECRET not set | Add CRON_SECRET to Vercel, redeploy |
| `Database connection failed` | DATABASE_URL invalid | Check Vercel Postgres connection string |
| Cron not appearing in dashboard | vercel.json not in root | Move vercel.json to project root, redeploy |
| Cron not executing | Free plan limitation | Upgrade to Vercel Pro (cron requires Pro+) |

---

## Rollback Plan

If cron job causes issues in production:

### Option 1: Disable Cron (Keep Code)

1. Edit `vercel.json` and remove the `crons` array:
   ```json
   {
     "crons": []
   }
   ```
2. Deploy: `git add vercel.json && git commit -m "chore: disable cron" && git push`

### Option 2: Full Rollback

```bash
# Rollback to previous deployment via Vercel Dashboard
# Go to: Deployments → [Previous Working Deployment] → "Promote to Production"
```

---

## Security Checklist

Before going live:

- [ ] `CRON_SECRET` is set in all Vercel environments
- [ ] `CRON_SECRET` is at least 32 characters (use `openssl rand -base64 32`)
- [ ] `CRON_SECRET` is not committed to Git (it's in Vercel env vars only)
- [ ] `/api/cron/cleanup-tokens` returns 401 without valid Bearer token
- [ ] `DATABASE_URL` points to production Postgres database
- [ ] Email credentials are for production SMTP server
- [ ] `NEXTAUTH_URL` matches production domain

---

## Additional Resources

- **Vercel Cron Jobs Documentation:** https://vercel.com/docs/cron-jobs
- **Vercel Environment Variables:** https://vercel.com/docs/environment-variables
- **Local Testing Guide:** `/CRON_DEPLOYMENT_GUIDE.md`
- **Technical Details:** `/src/lib/cron/README.md`

---

## Quick Reference Commands

```bash
# Generate secrets
openssl rand -base64 32

# Add environment variable
vercel env add CRON_SECRET

# View environment variables
vercel env ls

# Deploy to production
git push origin main

# View cron logs
vercel logs --filter="/api/cron/cleanup-tokens"

# Manual test (local)
export CRON_SECRET=$(openssl rand -base64 32)
pnpm dev
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cleanup-tokens

# Manual test (production)
curl -H "Authorization: Bearer YOUR_SECRET" https://your-app.vercel.app/api/cron/cleanup-tokens
```

---

**Last Updated:** 2025-11-14
**Status:** Production-ready ✅
