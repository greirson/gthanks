# Cron Jobs

This directory contains background job functions that run on a schedule via Vercel Cron Jobs.

## Available Jobs

### `cleanup-expired-tokens.ts`

**Purpose**: Deletes expired MagicLink and VerificationToken records from the database.

**Why**:
- Prevents security risks from expired tokens remaining in the database
- Reduces database bloat from accumulating old records
- Magic links expire after 15 minutes but tokens stay in DB indefinitely without cleanup

**Schedule**: Daily at midnight UTC (configured in `/vercel.json`)

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

## Production Setup

1. **Add CRON_SECRET to Vercel**:
   ```bash
   vercel env add CRON_SECRET
   # Enter a secure random value (use: openssl rand -base64 32)
   ```

2. **Deploy with vercel.json**:
   The `vercel.json` file in the project root configures the cron schedule:
   ```json
   {
     "crons": [{
       "path": "/api/cron/cleanup-tokens",
       "schedule": "0 0 * * *"
     }]
   }
   ```

3. **Verify in Vercel Dashboard**:
   - Go to your project settings
   - Navigate to "Cron Jobs" tab
   - You should see the scheduled job listed
   - Vercel automatically adds the correct Authorization header

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
- Only Vercel's cron service should have the `CRON_SECRET`
- Unauthorized requests return 401 status
- Failed cleanups are logged but don't expose sensitive data
