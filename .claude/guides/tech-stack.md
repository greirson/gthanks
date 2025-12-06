# Technology Stack

## Core

- **Framework**: Next.js 14.2.3 (App Router), React 18, TypeScript 5
- **Runtime**: Node.js 20+, pnpm

## Frontend

- **Styling**: Tailwind CSS 3.3, Radix UI primitives
- **Data**: TanStack React Query 5, react-hook-form + Zod
- **Extras**: Lucide React icons, next-themes, react-easy-crop

## Backend

- **Database**: Prisma 5.15 (SQLite dev / PostgreSQL prod)
- **Auth**: NextAuth.js 4.24
- **Processing**: Sharp (images), Nodemailer + Resend (email)
- **Protection**: rate-limiter-flexible

## Testing

- Jest 29 + Playwright 1.56 (80% coverage target)

## Essential Commands

| Command          | Purpose             |
| ---------------- | ------------------- |
| `pnpm dev`       | Start dev server    |
| `pnpm build`     | Production build    |
| `pnpm test`      | Run unit tests      |
| `pnpm test:e2e`  | Run E2E tests       |
| `pnpm lint`      | Run ESLint          |
| `pnpm typecheck` | TypeScript check    |
| `pnpm db:push`   | Push schema changes |
| `pnpm db:studio` | Open Prisma Studio  |

## Required Environment Variables

```env
DATABASE_URL=file:./data/gthanks.db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[generate: openssl rand -base64 32]
```

See deployment guides for optional OAuth and email configuration.
