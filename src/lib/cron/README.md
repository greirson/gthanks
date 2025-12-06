# Cron Jobs

This directory contains background job functions that run on a schedule.

## Available Jobs

### `cleanup-expired-tokens.ts`

**Purpose**: Deletes expired MagicLink and VerificationToken records from the database.

**Why**:

- Prevents security risks from expired tokens remaining in the database
- Reduces database bloat from accumulating old records
- Magic links expire after 15 minutes but tokens stay in DB indefinitely without cleanup

**API Endpoint**: `/api/cron/cleanup-tokens`

**Security**: Protected by `CRON_SECRET` environment variable

## Testing Locally

### Test the cleanup function directly:

```bash
npx tsx scripts/test-cleanup-cron.ts
```

### Test the API endpoint:

1. Set CRON_SECRET environment variable:

   ```bash
   export CRON_SECRET="test-secret-123"
   ```

2. Start the dev server:

   ```bash
   pnpm dev
   ```

3. In another terminal, run the API test:
   ```bash
   bash scripts/test-cleanup-api.sh
   ```

### Manual API test with curl:

```bash
curl -X GET http://localhost:3000/api/cron/cleanup-tokens \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Production Setup (Docker)

### 1. Set CRON_SECRET in your environment

Add to your `.env` or Docker environment:

```bash
# Generate a secure random value
openssl rand -base64 32
```

```env
CRON_SECRET=your-generated-secret
```

### 2. Set up external cron scheduler

Since Docker deployments don't have built-in cron scheduling like serverless platforms, you need an external scheduler. Options include:

**Option A: Host cron job**

Add to your host's crontab (`crontab -e`):

```bash
# Run token cleanup daily at midnight
0 0 * * * curl -X GET "https://your-domain.com/api/cron/cleanup-tokens" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/gthanks-cron.log 2>&1
```

**Option B: Separate cron container**

Add to your `docker-compose.yml`:

```yaml
services:
  cron:
    image: alpine:latest
    command: >
      sh -c "echo '0 0 * * * wget -q -O - --header=\"Authorization: Bearer $$CRON_SECRET\" http://app:3000/api/cron/cleanup-tokens' | crontab - && crond -f"
    environment:
      - CRON_SECRET=${CRON_SECRET}
    depends_on:
      - app
    restart: unless-stopped
```

**Option C: External cron service**

Use services like:

- [cron-job.org](https://cron-job.org) (free)
- [EasyCron](https://www.easycron.com)
- [Cronitor](https://cronitor.io)

Configure them to call your endpoint with the Authorization header.

### 3. Verify cron execution

Check the logs to verify the cron job is running:

```bash
# View recent cron logs
docker logs gthanks-app --tail=100 | grep cleanup
```

**Expected output:**

```
Cleaned up expired tokens: MagicLinks: 5, VerificationTokens: 12
```

## Cron Schedule Format

The schedule uses standard cron syntax:

- `0 0 * * *` = Daily at midnight UTC
- Format: `minute hour day month dayOfWeek`

Examples:

- `0 0 * * *` = Daily at midnight
- `0 */6 * * *` = Every 6 hours
- `0 0 * * 0` = Weekly on Sunday at midnight
- `0 3 1 * *` = Monthly on the 1st at 3am

## Security Notes

- The API endpoint requires Bearer token authentication
- Only your cron scheduler should have the `CRON_SECRET`
- Unauthorized requests return 401 status
- Failed cleanups are logged but don't expose sensitive data
