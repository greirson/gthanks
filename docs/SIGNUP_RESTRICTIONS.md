# Signup Restrictions

## Overview

Control who can create new accounts on your gthanks instance using environment variables.

## Environment Variables

Add these to your `.env.local` (development) or `.env` (production) file:

```bash
# Signup Restrictions (optional)

# Disable all new user signups
# DISABLE_SIGNUPS=true

# Comma-separated whitelist of allowed emails and domains
# Format: "email@example.com,*@domain.com,another@example.com"
# - Exact emails: user@example.com
# - Domain wildcards: *@company.com (matches any email @company.com)
# ALLOWED_SIGNUP_EMAILS="admin@example.com,*@company.com,*@partner.org"
```

## Configuration Examples

### Scenario 1: Open Signups (Default)

No configuration needed - this is the current MVP behavior.

```bash
# No env vars = anyone can sign up
```

**Result:** Anyone can create an account. First user automatically becomes admin.

---

### Scenario 2: Completely Closed

Disable all new signups. Only existing users can log in.

```bash
DISABLE_SIGNUPS=true
```

**Use cases:**
- Maintenance mode
- Private family instance (after everyone has signed up)
- Closed beta

**Result:** New signup attempts show "Registration Disabled" error.

---

### Scenario 3: Email Whitelist (Family)

Allow only specific email addresses to sign up.

```bash
ALLOWED_SIGNUP_EMAILS="alice@gmail.com,bob@yahoo.com,grandma@hotmail.com"
```

**Use cases:**
- Family wishlist (known members only)
- Small friend group
- Invite-only instance

**Result:** Only listed emails can create accounts.

---

### Scenario 4: Domain Whitelist (Company)

Allow all emails from specific domains.

```bash
ALLOWED_SIGNUP_EMAILS="*@company.com,*@partner.org"
```

**Use cases:**
- Company internal tool
- Organization-specific deployment
- School/university instance

**Result:** Anyone with @company.com or @partner.org email can sign up.

---

### Scenario 5: Hybrid (Mixed)

Combine specific emails with domain wildcards.

```bash
ALLOWED_SIGNUP_EMAILS="admin@external.com,contractor@freelance.com,*@company.com"
```

**Use cases:**
- Company employees + external consultants
- Organization + selected partners
- Flexible access control

**Result:** Listed emails OR emails from listed domains can sign up.

---

## How It Works

### Priority Logic

1. **DISABLE_SIGNUPS=true** → Block all signups (highest priority)
2. **ALLOWED_SIGNUP_EMAILS** set → Only allow matches
3. **Neither variable set** → Allow all signups (backward compatible)

### Matching Rules

**Email matching is case-insensitive:**
```bash
ALLOWED_SIGNUP_EMAILS="User@Example.com"
# Matches: user@example.com, USER@EXAMPLE.COM, etc.
```

**Whitespace is automatically trimmed:**
```bash
ALLOWED_SIGNUP_EMAILS=" user@example.com , *@company.com "
# Works correctly despite extra spaces
```

**Wildcard domains match exactly:**
```bash
ALLOWED_SIGNUP_EMAILS="*@company.com"
# ✅ Matches: user@company.com
# ❌ Does NOT match: user@sub.company.com (subdomain)
```

### Applied to All Auth Methods

Restrictions apply equally to:
- ✅ Magic link (email) authentication
- ✅ Google OAuth
- ✅ Facebook OAuth
- ✅ Apple OAuth
- ✅ Generic OAuth/OIDC providers

**No bypass possible** - all auth flows check the same restrictions.

---

## Security Features

### No Information Disclosure

Error messages are generic and don't reveal:
- Whether signups are globally disabled
- If a whitelist exists
- Whether the email or domain was the issue
- Whitelist contents

**Error messages users see:**
- "New user registration is currently disabled" (when DISABLE_SIGNUPS=true)
- "You do not have permission to sign in" (when email not on whitelist)

### Server-Side Logging

Detailed logs are recorded server-side only:

```
[WARN] Signup attempt blocked
  domain: example.com
  provider: google
  reason: Not on whitelist
```

**Privacy:** Logs domain only, not the full email address.

### Attack Prevention

- ✅ **Provider bypass** - Same validation for all auth methods
- ✅ **Case variation** - Normalized to lowercase
- ✅ **Timing attacks** - O(1) Set-based lookup
- ✅ **Subdomain bypass** - Exact domain match only
- ✅ **Information leakage** - Generic error messages

---

## Deployment

### Step 1: Update Environment Variables

Edit your `.env.local` (development) or production environment:

```bash
# Example: Company instance
ALLOWED_SIGNUP_EMAILS="*@company.com,*@partner.org"
```

### Step 2: Restart Application

```bash
# Development
pnpm dev

# Production (Docker)
docker compose restart app
```

### Step 3: Test

1. **Test allowed email:**
   - Try signing up with email from allowed domain
   - Should succeed

2. **Test blocked email:**
   - Try signing up with email NOT on whitelist
   - Should see "Access Denied" error

3. **Test existing users:**
   - Existing users should still be able to log in
   - Restrictions only apply to NEW signups

---

## Monitoring

Monitor blocked signup attempts in your application logs:

```bash
# Docker logs
docker logs gthanks-app 2>&1 | grep "Signup attempt blocked"

# Development logs
# Check console output for warnings
```

Example log entry:

```
[WARN] Signup attempt blocked
  domain: external.com
  provider: email
  reason: Not on whitelist
```

---

## Migration

### From Open to Restricted

**Step 1:** Allow current users to sign up first

```bash
# No restrictions yet - let everyone join
```

**Step 2:** After all intended users have accounts, restrict signups

```bash
DISABLE_SIGNUPS=true
```

**Step 3:** Monitor logs for blocked attempts

```bash
docker logs gthanks-app 2>&1 | grep "Signup attempt blocked"
```

### From Restricted to Open

Remove or comment out environment variables:

```bash
# DISABLE_SIGNUPS=true
# ALLOWED_SIGNUP_EMAILS="..."
```

Restart the application.

---

## Troubleshooting

### Issue: Legitimate user can't sign up

**Symptom:** User sees "Access Denied" error

**Solution:**
1. Verify their email is in `ALLOWED_SIGNUP_EMAILS`
2. Check for typos in email/domain
3. Ensure domain wildcard uses correct format: `*@company.com`
4. Check case sensitivity (should work, but verify)

### Issue: Restrictions not working

**Symptom:** Blocked users can still sign up

**Solution:**
1. Verify environment variables are set correctly
2. Restart application after env var changes
3. Check logs to confirm service is reading config
4. Verify no syntax errors in env var values

### Issue: Existing users can't log in

**Symptom:** Existing user sees "Access Denied"

**Solution:** This shouldn't happen - restrictions only apply to NEW signups. If it does:
1. Check application logs for errors
2. Verify user exists in database
3. File a bug report with details

---

## Notes

- **Existing users unaffected:** Restrictions only apply to new signups
- **First user admin:** First signup always becomes admin (even with restrictions)
- **No runtime changes:** Config changes require app restart
- **Backward compatible:** No env vars = current MVP behavior (open signups)
- **Privacy-first:** Server logs domain only, not full emails

---

## Examples for .env Files

Copy one of these sections into your `.env.local` or `.env` file:

### Family Instance

```bash
# Signup Restrictions - Family only
ALLOWED_SIGNUP_EMAILS="alice@gmail.com,bob@yahoo.com,charlie@hotmail.com"
```

### Company Instance

```bash
# Signup Restrictions - Company employees only
ALLOWED_SIGNUP_EMAILS="*@company.com"
```

### Closed Instance

```bash
# Signup Restrictions - No new signups
DISABLE_SIGNUPS=true
```

### Open Instance (Default)

```bash
# No signup restrictions (anyone can sign up)
# No environment variables needed
```

---

## See Also

- [Deployment Guide](./DOCKER_DEPLOYMENT.md)
- [Environment Variables](../README.md#environment-variables)
- [Authentication Setup](../README.md#authentication)
