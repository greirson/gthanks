# gthanks

Simple family wishlist coordination to prevent duplicate gifts.

## ⚠️ ACTIVE DEVELOPMENT WARNING

**This project is under very active development. Database schema changes may occur frequently and could potentially destroy or corrupt your wishes and lists.**

**DO NOT use gthanks as your only storage solution for important wishlists.**

**Recommendations:**

- Keep external backups of critical wishlist data
- Expect breaking changes during development
- Use at your own risk until stable release (v1.0)

## Features

- Magic link authentication with OAuth support (Google, Facebook, Apple, OIDC)
- Wish lists with 1-3 star priorities
- Family groups with shared lists
- Hidden gift reservations (invisible to list owners)
- Automatic product URL scraping
- Mobile-responsive design (iPhone SE 375px minimum)

## 🚀 Quick Start (First Time Setup)

Get started in under 60 seconds:

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd gthanks
pnpm install

# 2. Start development (will prompt for setup on first run)
pnpm dev
```

**That's it!** 🎉

The first time you run `pnpm dev`, it will:

- ✅ Detect you need setup
- ✅ Offer automatic or manual configuration
- ✅ Generate `.env.local` with secure secrets
- ✅ Create SQLite database
- ✅ Start the dev server at http://localhost:3000

### What You Get Out of the Box

- 🔐 **Authentication**: Secure session encryption
- 📧 **Email**: Magic links logged to console (no SMTP needed)
- 💾 **Database**: SQLite at `data/gthanks.db`
- 🌐 **Local Server**: http://localhost:3000

### Testing Authentication

1. Navigate to http://localhost:3000
2. Enter any email (e.g., `dev@example.com`)
3. Check terminal for magic link:
   ```
   === EMAIL SENT ===
   To: dev@example.com
   Sign-in URL: http://localhost:3000/api/auth/verify?token=...
   =================
   ```
4. Click the URL to sign in

### Manual Setup (Optional)

If you prefer manual configuration:

```bash
# Copy template
cp .env.local.example .env.local

# Generate secret
node scripts/generate-secret.js

# Edit .env.local and add:
# NEXTAUTH_SECRET=<paste-generated-secret>

# Start dev
pnpm dev
```

### Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests
pnpm lint             # Run linter
pnpm typecheck        # TypeScript checking
pnpm db:push          # Update database schema
pnpm db:studio        # Open Prisma Studio GUI
```

See `docs/QUICK_REFERENCE.md` for complete command reference.

## Deployment

### Docker with SQLite (Simple)

Best for personal/family use (under 100 users):

```bash
# Set required environment variable
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Start container
docker compose up -d
```

The app will be available at http://localhost:3000

Data persists in `./data/gthanks.db` - backup with `cp data/gthanks.db backup.db`

### Docker with PostgreSQL (Production)

Best for larger deployments with higher traffic:

```bash
# Set required environment variables
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Start containers
docker compose -f docker-compose.postgres.yml up -d
```

The app will be available at http://localhost:3000

### Deployment Scripts

Automated deployment helpers are available in the `scripts/` directory:

- `scripts/deploy.sh` - Automated deployment with health checks
- `scripts/backup-database.sh` - Database backup utility
- `scripts/rollback.sh` - Rollback to previous version
- `scripts/health-check.sh` - Verify deployment health

### Full Deployment Guide

See `docs/DOCKER_DEPLOYMENT.md` for complete deployment documentation including:

- Reverse proxy setup (Nginx, Traefik)
- SSL/TLS configuration
- Scaling considerations
- Monitoring and logging

## Environment Variables

### Required

```env
NEXTAUTH_SECRET=your-32-character-secret-here  # Generate: openssl rand -base64 32
DATABASE_URL=file:./data/gthanks.db            # SQLite (dev) or postgresql://... (prod)
```

### Optional - Authentication

```env
NEXTAUTH_URL=http://localhost:3000             # Your app's public URL

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# Apple Sign In
APPLE_CLIENT_ID=your-apple-service-id
APPLE_CLIENT_SECRET=your-apple-client-secret

# Generic OIDC Provider (Pocket ID, Auth0, Keycloak, etc.)
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_ISSUER=https://auth.example.com
```

### Optional - Email

```env
EMAIL_FROM=noreply@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Optional - Monitoring

```env
SENTRY_DSN=https://...@sentry.io/...
```

See `docs/SECRETS_MANAGEMENT.md` for secure secrets handling and complete environment variable reference.

## Documentation

- **CLAUDE.md** - Development guidelines and project overview
- **docs/DOCKER_DEPLOYMENT.md** - Complete deployment guide
- **docs/QUICK_REFERENCE.md** - Command and configuration cheat sheet
- **docs/SECRETS_MANAGEMENT.md** - Environment variables and secrets

## Tech Stack

- **Framework**: Next.js 14 with App Router + TypeScript 5
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Authentication**: NextAuth.js v4 with magic links + OAuth
- **UI**: Tailwind CSS + Radix UI primitives
- **Data Fetching**: TanStack React Query 5
- **Testing**: Jest (unit/integration) + Playwright (E2E)
- **Images**: Sharp for processing
- **Email**: Nodemailer + Resend
- **Rate Limiting**: rate-limiter-flexible (in-memory)

## Development Workflow

This project uses GitHub Flow:

1. Create a feature branch from `main`
2. Make changes and push
3. Open a pull request
4. CI runs automatically (lint, test, build)
5. Merge to `main` after CI passes

Branch protection requires all PRs to pass CI before merging.

## Testing

```bash
# Unit tests
pnpm test                    # Run all unit tests
pnpm test:watch              # Watch mode
pnpm test:coverage           # Coverage report

# Integration tests
pnpm test:integration        # Run integration tests

# E2E tests
pnpm test:e2e                # Run all E2E tests
pnpm test:e2e:ui             # Playwright UI mode
pnpm test:e2e:headed         # Run with browser visible
```

## License

MIT
