# Secrets Management Guide

Best practices for managing environment variables and secrets across development, staging, and production environments.

---

## Overview

gthanks uses environment variables for configuration and secrets. This guide ensures:

- Secrets are never committed to Git
- Each environment has appropriate secrets
- Rotation procedures are documented
- OAuth credentials are properly managed

---

## Environment Structure

### Development (Local)

**Database:** SQLite (local file)
**Purpose:** Active development, testing
**Security Level:** Low (local only)

### Staging

**Database:** PostgreSQL (cloud)
**Purpose:** Pre-release testing, beta testers
**Security Level:** Medium (test data, limited users)

### Production

**Database:** PostgreSQL (cloud)
**Purpose:** Live users
**Security Level:** High (real user data)

---

## Required Environment Variables

### All Environments (Required)

```env
# Database
DATABASE_URL=<connection-string>

# Authentication
NEXTAUTH_URL=<your-app-url>
NEXTAUTH_SECRET=<32-char-random-string>
```

### Production Only (Required)

```env
# Cron jobs (if using Vercel)
CRON_SECRET=<32-char-random-string>

# Email (for magic links)
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<smtp-username>
SMTP_PASS=<smtp-password>

# Monitoring (optional but recommended)
SENTRY_DSN=<sentry-dsn>
```

### Optional (All Environments)

```env
# OAuth Providers (optional)
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>

FACEBOOK_CLIENT_ID=<facebook-app-id>
FACEBOOK_CLIENT_SECRET=<facebook-app-secret>

APPLE_ID=<apple-service-id>
APPLE_SECRET=<apple-private-key>

# Generic OIDC Provider
OIDC_CLIENT_ID=<oidc-client-id>
OIDC_CLIENT_SECRET=<oidc-client-secret>
OIDC_ISSUER=<oidc-issuer-url>

# Rate Limiting (for distributed deployments)
REDIS_URL=redis://localhost:6379
```

---

## Generating Secrets

### NEXTAUTH_SECRET

**Purpose:** Encrypts session cookies and JWT tokens

**Generate:**

```bash
openssl rand -base64 32
```

**Example output:**

```
zT6X7gIkWiBNFlwerg3kDxuVZWk3JeZjkY2h9VVIetc=
```

**Requirements:**

- Minimum 32 characters
- Use cryptographically secure random generator
- Different value per environment

**Set in environment:**

```env
NEXTAUTH_SECRET=zT6X7gIkWiBNFlwerg3kDxuVZWk3JeZjkY2h9VVIetc=
```

---

### CRON_SECRET

**Purpose:** Authenticates cron job requests (prevents unauthorized execution)

**Generate:**

```bash
openssl rand -base64 32
```

**Set in environment:**

```env
CRON_SECRET=your-generated-secret
```

**Usage:**

```bash
# Cron jobs include this in Authorization header
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/cron/cleanup-tokens
```

---

### PostgreSQL Password

**Purpose:** Database authentication

**Generate:**

```bash
openssl rand -base64 48
```

**Set in DATABASE_URL:**

```env
DATABASE_URL=postgresql://gthanks:your-password-here@host:5432/gthanks
```

**Requirements:**

- Minimum 16 characters (48 recommended)
- Include special characters
- Different password per environment

---

## OAuth Credentials

OAuth credentials must be configured separately for each environment because callback URLs differ.

### Google OAuth

**Create credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project: `gthanks-dev` (development) or `gthanks-prod` (production)
3. Enable Google+ API
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:

**Development:**

```
http://localhost:3000/api/auth/callback/google
```

**Staging:**

```
https://staging.yourdomain.com/api/auth/callback/google
```

**Production:**

```
https://yourdomain.com/api/auth/callback/google
```

**Set in environment:**

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

---

### Facebook OAuth

**Create credentials:**

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create app: `gthanks Dev` (development) or `gthanks` (production)
3. Add Facebook Login product
4. Configure OAuth redirect URIs:

**Development:**

```
http://localhost:3000/api/auth/callback/facebook
```

**Staging:**

```
https://staging.yourdomain.com/api/auth/callback/facebook
```

**Production:**

```
https://yourdomain.com/api/auth/callback/facebook
```

**Set in environment:**

```env
FACEBOOK_CLIENT_ID=1234567890123456
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

---

### Apple OAuth

**Create credentials:**

1. Go to [Apple Developer](https://developer.apple.com)
2. Create Service ID
3. Configure Return URLs:

**Development:**

```
http://localhost:3000/api/auth/callback/apple
```

**Production:**

```
https://yourdomain.com/api/auth/callback/apple
```

**Set in environment:**

```env
APPLE_ID=com.yourdomain.gthanks.service
APPLE_SECRET=<private-key-content>
```

**Note:** Apple OAuth is more complex. See [NextAuth Apple Provider Docs](https://next-auth.js.org/providers/apple) for detailed setup.

---

## Email Configuration (SMTP)

### Development (Optional)

Use a test email service like Mailtrap or Ethereal:

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-username
SMTP_PASS=your-ethereal-password
EMAIL_FROM=dev@gthanks.local
```

**Ethereal Email:** https://ethereal.email (fake SMTP for testing)

### Staging

Use a transactional email service with a test domain:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging@yourdomain.com
SMTP_PASS=your-app-password
EMAIL_FROM=staging@yourdomain.com
```

**Gmail App Password:** https://support.google.com/accounts/answer/185833

### Production

Use a production-grade transactional email service:

**Option 1: Gmail (small deployments)**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

**Option 2: SendGrid (scalable)**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

**Option 3: Resend (modern API)**

```env
# Resend uses API key, not SMTP
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
```

---

## Secret Rotation

### When to Rotate Secrets

**Immediate rotation required:**

- [ ] Secret leaked to public repository
- [ ] Secret exposed in logs or error messages
- [ ] Employee with access leaves team
- [ ] Suspected security breach

**Scheduled rotation (recommended):**

- [ ] Every 90 days for NEXTAUTH_SECRET
- [ ] Every 180 days for database passwords
- [ ] Every 365 days for OAuth credentials
- [ ] After major security incidents (industry-wide)

---

### Rotating NEXTAUTH_SECRET

**Impact:** All users logged out (sessions invalidated)

**Procedure:**

1. **Generate new secret:**

   ```bash
   openssl rand -base64 32
   ```

2. **Update environment variable:**

   ```bash
   # For Docker
   # Edit .env or docker-compose.yml
   NEXTAUTH_SECRET=new-secret-here

   # For Vercel
   vercel env add NEXTAUTH_SECRET
   # Enter new value, select Production
   ```

3. **Deploy application:**

   ```bash
   docker compose up -d  # Docker
   # OR
   git push origin production  # Vercel
   ```

4. **Notify users:**
   - Post notice: "Scheduled maintenance - please log in again"
   - Send email if critical

5. **Monitor:**
   - Check authentication logs
   - Verify users can log in with new secret

**Rollback plan:**
Keep old secret for 24 hours. If issues arise:

```bash
# Revert to old secret
NEXTAUTH_SECRET=old-secret-here
docker compose up -d
```

---

### Rotating Database Password

**Impact:** Application downtime during rotation (5-10 minutes)

**Procedure:**

1. **Schedule maintenance window:**
   - Low-traffic time (e.g., 2 AM)
   - Notify users via status page

2. **Generate new password:**

   ```bash
   openssl rand -base64 48
   ```

3. **Update database password:**

   ```bash
   # For PostgreSQL
   docker compose exec postgres psql -U gthanks -c "ALTER USER gthanks PASSWORD 'new-password';"
   ```

4. **Update environment variable:**

   ```env
   DATABASE_URL=postgresql://gthanks:new-password@host:5432/gthanks
   ```

5. **Restart application:**

   ```bash
   docker compose restart app
   ```

6. **Verify connectivity:**
   ```bash
   curl https://your-domain.com/api/health
   ```

---

### Rotating OAuth Credentials

**Impact:** OAuth login temporarily unavailable (5 minutes)

**Procedure:**

1. **Generate new credentials in provider console:**
   - Keep old credentials active during transition

2. **Update environment variables:**

   ```env
   GOOGLE_CLIENT_ID=new-client-id
   GOOGLE_CLIENT_SECRET=new-client-secret
   ```

3. **Deploy application:**

   ```bash
   docker compose up -d
   ```

4. **Test OAuth login:**
   - Try logging in with Google
   - Verify callback works

5. **Deactivate old credentials:**
   - After confirming new credentials work
   - Delete old credentials from provider console

---

## Environment-Specific Configuration

### Development (.env.local)

```env
# Local SQLite database
DATABASE_URL=file:./data/gthanks.db

# Development URL
NEXTAUTH_URL=http://localhost:3000

# Generated secret (can use same for all devs)
NEXTAUTH_SECRET=dev-secret-not-for-production-use-only

# Optional: OAuth test credentials
GOOGLE_CLIENT_ID=dev-google-client-id
GOOGLE_CLIENT_SECRET=dev-google-secret

# Optional: Test email (Ethereal)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=test@ethereal.email
SMTP_PASS=test-password
EMAIL_FROM=dev@gthanks.local
```

**Security notes:**

- Use test OAuth credentials (not production)
- Use test email service (not production SMTP)
- Database contains test data only
- Can share secrets with team (not sensitive)

---

### Staging (.env.staging)

```env
# Staging PostgreSQL
DATABASE_URL=postgresql://gthanks:staging-password@staging-db.example.com:5432/gthanks

# Staging URL
NEXTAUTH_URL=https://staging.yourdomain.com

# Staging secret (unique to staging)
NEXTAUTH_SECRET=<staging-specific-secret>

# Staging OAuth credentials (separate from production)
GOOGLE_CLIENT_ID=staging-google-client-id
GOOGLE_CLIENT_SECRET=staging-google-secret

# Staging email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging@yourdomain.com
SMTP_PASS=staging-email-password
EMAIL_FROM=staging@yourdomain.com

# Monitoring (optional)
SENTRY_DSN=https://staging-sentry-dsn@sentry.io/...
```

**Security notes:**

- Use separate OAuth credentials (different callback URL)
- Use dedicated email address for staging
- Database contains test data (but treat as semi-sensitive)
- Don't share staging secrets publicly

---

### Production (.env.production)

```env
# Production PostgreSQL
DATABASE_URL=postgresql://gthanks:prod-password@prod-db.example.com:5432/gthanks

# Production URL
NEXTAUTH_URL=https://yourdomain.com

# Production secret (CRITICAL - rotate every 90 days)
NEXTAUTH_SECRET=<production-secret>

# Cron secret (CRITICAL)
CRON_SECRET=<cron-secret>

# Production OAuth credentials
GOOGLE_CLIENT_ID=prod-google-client-id
GOOGLE_CLIENT_SECRET=prod-google-secret

FACEBOOK_CLIENT_ID=prod-facebook-app-id
FACEBOOK_CLIENT_SECRET=prod-facebook-secret

# Production email (high deliverability)
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>

# Monitoring (REQUIRED)
SENTRY_DSN=https://prod-sentry-dsn@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=gthanks

# Rate limiting (if distributed)
REDIS_URL=redis://prod-redis.example.com:6379
```

**Security notes:**

- NEVER commit production secrets to Git
- Store secrets in secure vault (1Password, AWS Secrets Manager)
- Rotate secrets every 90 days
- Limit access to production secrets (only admins)
- Use separate OAuth credentials (different callback URL)

---

## Secret Storage Best Practices

### Local Development

**Store in `.env.local`:**

```bash
# Create .env.local (gitignored)
cp .env.example .env.local
# Edit .env.local with your values
```

**Never commit:**

- `.env.local`
- `.env`
- `.env.production`

**Already in `.gitignore`:**

```
.env
.env.local
.env.*.local
```

---

### Docker Deployment

**Option 1: Environment file**

```bash
# Create .env file (gitignored)
cat > .env <<EOF
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
EOF

# Use in docker-compose.yml
docker compose --env-file .env up -d
```

**Option 2: Docker secrets** (recommended for production)

```bash
# Create secrets
echo "your-secret" | docker secret create nextauth_secret -
echo "your-db-password" | docker secret create db_password -

# Use in docker-compose.yml
services:
  app:
    secrets:
      - nextauth_secret
      - db_password
```

---

### Vercel Deployment

**Add secrets via CLI:**

```bash
# Production
vercel env add NEXTAUTH_SECRET production

# Staging
vercel env add NEXTAUTH_SECRET preview

# Development
vercel env add NEXTAUTH_SECRET development
```

**Add secrets via Dashboard:**

1. Go to Vercel dashboard
2. Select project
3. Settings → Environment Variables
4. Add variable
5. Select environment (Production, Preview, Development)

**Pull secrets for local development:**

```bash
vercel env pull .env.local
```

---

## Secrets Checklist

### Before First Deployment

- [ ] Generate NEXTAUTH_SECRET (unique per environment)
- [ ] Generate CRON_SECRET (if using cron jobs)
- [ ] Generate database password (16+ characters)
- [ ] Create OAuth credentials (per environment)
- [ ] Configure email SMTP credentials
- [ ] Set up monitoring (Sentry DSN)
- [ ] Verify all secrets are set in deployment platform
- [ ] Verify no secrets committed to Git

### After Deployment

- [ ] Verify health check passes
- [ ] Test authentication (login/logout)
- [ ] Test OAuth providers (if configured)
- [ ] Test email sending (magic links)
- [ ] Verify cron jobs authenticate correctly
- [ ] Check monitoring dashboard (Sentry)

### Regular Maintenance

- [ ] Rotate NEXTAUTH_SECRET every 90 days
- [ ] Rotate database password every 180 days
- [ ] Review OAuth credentials every 365 days
- [ ] Audit secret access logs quarterly
- [ ] Review and revoke unused API keys
- [ ] Update secrets documentation

---

## Security Incident Response

### If Secret is Leaked

**Immediate actions:**

1. **Rotate secret immediately:**

   ```bash
   # Generate new secret
   openssl rand -base64 32

   # Update environment
   # Deploy immediately
   ```

2. **Revoke old secret:**
   - Mark as compromised in secrets manager
   - Delete from all environments

3. **Audit access:**
   - Check logs for unauthorized access
   - Review recent activity
   - Identify affected users

4. **Notify stakeholders:**
   - Security team
   - Affected users (if applicable)
   - Management

5. **Post-mortem:**
   - How was secret leaked?
   - How to prevent in future?
   - Update documentation

---

## Resources

- [NextAuth Configuration](https://next-auth.js.org/configuration/options)
- [Google OAuth Setup](https://console.cloud.google.com)
- [Facebook OAuth Setup](https://developers.facebook.com)
- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---

**Last Updated:** 2025-11-17
**Status:** Production-ready
