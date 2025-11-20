# Technology Stack

## Core Framework & Language

- **Framework**: Next.js 14.2.3 (App Router)
- **Language**: TypeScript 5
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm

## Frontend

- **UI Framework**: React 18
- **Styling**: Tailwind CSS 3.3
- **Component Library**: Radix UI (primitives)
- **Data Fetching**: TanStack React Query 5.80
- **Form Handling**: react-hook-form 7.58 + Zod 3.23
- **Icons**: Lucide React 0.290
- **Themes**: next-themes 0.4.6
- **Image Cropping**: react-easy-crop 5.5

## Backend

- **Database**: SQLite (dev) / PostgreSQL 15+ (prod)
- **ORM**: Prisma 5.15
- **Authentication**: NextAuth.js 4.24.10
- **Password Hashing**: @node-rs/argon2 2.0
- **Email**: Nodemailer 6.9.16 + Resend 6.0
- **Image Processing**: Sharp 0.34
- **Rate Limiting**: rate-limiter-flexible 8.1
- **Caching**: node-cache 5.1 (single-instance) / Valkey (distributed, future)

## Testing & Quality

- **Unit Tests**: Jest 29 + @testing-library/react 16
- **E2E Tests**: Playwright 1.56
- **Code Quality**: ESLint 8 + Prettier 3.6
- **Type Checking**: TypeScript (strict mode)
- **Test Coverage Target**: 80% for critical paths

## Monitoring & Observability

- **Error Tracking**: Sentry (production)
- **Performance Monitoring**: Sentry Performance
- **Logging**: Console (structured logs in production)

## Development Commands

```bash
# Installation
pnpm install              # Install all dependencies
pnpm postinstall          # Auto-runs: prisma generate

# Development
pnpm dev                  # Start dev server (http://localhost:3000)
pnpm dev:inspect          # Start with Node.js debugger
pnpm dev:inspect-brk      # Start with debugger (break on start)
pnpm dev:memory           # Start with increased memory + inspector
pnpm dev:clean            # Clean database and restart dev server

# Building
pnpm build                # Production build
pnpm build:analyze        # Build with bundle analyzer
pnpm start                # Start production server

# Database
pnpm db:push              # Push schema changes to database
pnpm db:studio            # Open Prisma Studio GUI
pnpm db:generate          # Generate Prisma Client
pnpm db:ensure            # Ensure database exists and is migrated

# Testing
pnpm test                 # Run unit tests
pnpm test:watch           # Run unit tests in watch mode
pnpm test:coverage        # Run tests with coverage report
pnpm test:integration     # Run integration tests
pnpm test:integration:watch # Integration tests in watch mode
pnpm test:all             # Run all tests (unit + integration)

# E2E Testing
pnpm test:e2e             # Run all E2E tests
pnpm test:e2e:ui          # Run E2E tests with Playwright UI
pnpm test:e2e:headed      # Run E2E tests in headed mode
pnpm test:e2e:debug       # Run E2E tests in debug mode
pnpm test:e2e:report      # Show E2E test report
pnpm test:e2e:chromium    # Run E2E tests on Chromium only
pnpm test:e2e:firefox     # Run E2E tests on Firefox only
pnpm test:e2e:webkit      # Run E2E tests on WebKit only

# Code Quality
pnpm lint                 # Run ESLint
pnpm lint:fix             # Fix auto-fixable ESLint issues
pnpm lint:strict          # Run ESLint with zero warnings allowed
pnpm lint:service-layer   # Check service layer compliance
pnpm format               # Format code with Prettier
pnpm format:check         # Check code formatting
pnpm typecheck            # Run TypeScript type checking
```

## Environment Variables

### Required

```env
# Database
DATABASE_URL=file:./data/gthanks.db  # SQLite (dev) or postgresql://... (prod)

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[32+ char random string]  # Generate: openssl rand -base64 32
```

**BREAKING CHANGE (2025-11-19):**
The default SQLite database location has changed from `file:./prisma/dev2.db` to `file:./data/gthanks.db`.

**Migration for existing developers:**
- **Option 1 (Recommended)**: Move your database file to the new location:
  ```bash
  mkdir -p data
  mv prisma/dev2.db data/gthanks.db
  ```
- **Option 2**: Update your `.env.local` to point to the old location:
  ```env
  DATABASE_URL=file:./prisma/dev2.db
  ```
- **Option 3**: Start fresh with a new database (will lose existing development data):
  ```bash
  pnpm db:push
  ```

**Rationale:** The new `data/` directory consolidates all runtime data (database, uploads) separate from source code and configuration files, making backups and deployment cleaner.

### Optional - OAuth Providers

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Facebook OAuth
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Apple OAuth
APPLE_ID=
APPLE_SECRET=

# Generic OIDC Provider
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_ISSUER=
```

### Optional - Email

```env
EMAIL_FROM=noreply@gthanks.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Optional - Monitoring (Production)

```env
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

### Optional - Rate Limiting (Distributed)

```env
# Valkey/Redis connection (for multi-instance deployments)
REDIS_URL=redis://localhost:6379
```

## Production Dependencies

Key production packages and their purposes:

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.3 | Framework |
| react | 18.2.0 | UI library |
| @prisma/client | 5.15.0 | Database ORM |
| next-auth | 4.24.10 | Authentication |
| @tanstack/react-query | 5.80.6 | Data fetching & caching |
| zod | 3.23.8 | Schema validation |
| react-hook-form | 7.58.0 | Form management |
| @radix-ui/* | Latest | UI primitives |
| tailwindcss | 3.3.0 | Styling |
| sharp | 0.34.2 | Image processing |
| nodemailer | 6.9.16 | Email sending |
| rate-limiter-flexible | 8.1.0 | Rate limiting |

## Development Dependencies

Key development packages:

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | 5.0.0 | Type safety |
| @playwright/test | 1.56.1 | E2E testing |
| jest | 29.0.0 | Unit testing |
| @testing-library/react | 16.3.0 | React testing utilities |
| eslint | 8.0.0 | Code linting |
| prettier | 3.6.2 | Code formatting |
| prisma | 5.15.0 | Database tooling |

## Platform Support

**Development:**
- macOS (Apple Silicon & Intel)
- Linux (ARM64 & AMD64)
- Windows (via WSL2 recommended)

**Production Deployment:**
- Docker (all platforms)
- Vercel (alternative)
- Any Node.js 20+ hosting platform

## Browser Support

**Minimum Support:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

**Testing Priority:**
1. Chrome (primary)
2. Safari (iOS primary user base)
3. Firefox (cross-browser validation)

## Known Limitations

### Amazon Product Scraping

**Issue**: Amazon uses advanced bot detection that blocks automated scraping from server IPs.

**Behavior**:
- System attempts automatic extraction of title, price, and image from Amazon URLs
- Falls back to manual entry if CAPTCHA/bot detection triggers
- Product URL is saved; user types title/price manually
- Same limitation affects Lego and other Cloudflare-protected sites

**Future Enhancement**: Playwright-based browser automation (requires larger server resources)
