# Database Migration: SQLite to PostgreSQL

## Why PostgreSQL?

PostgreSQL handles concurrent users and scales better than SQLite. Use SQLite for development, PostgreSQL for production.

## Migration Steps

### 1. Get Connection String

| Provider | Connection String Format                                                             |
| -------- | ------------------------------------------------------------------------------------ |
| Neon     | `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/gthanks?sslmode=require`      |
| Supabase | `postgresql://postgres:pass@db.xxx.supabase.co:6543/postgres` (use pooled port 6543) |
| Railway  | `postgresql://postgres:pass@containers-us-west-xxx.railway.app:6543/railway`         |
| Docker   | `postgresql://postgres:pass@localhost:5432/gthanks`                                  |

### 2. Update Prisma Schema

Edit `prisma/schema.prisma` line 17:

```prisma
provider = "postgresql"  // Changed from "sqlite"
```

### 3. Set Environment Variable

```env
DATABASE_URL=postgresql://user:password@host:5432/gthanks?schema=public
```

### 4. Apply Migration

```bash
pnpm prisma generate
pnpm db:push
pnpm db:studio  # Verify tables created
```

## Common Issues

| Error                       | Solution                                        |
| --------------------------- | ----------------------------------------------- |
| `Can't reach database`      | Check connection string, firewall, IP allowlist |
| `SSL connection required`   | Add `?sslmode=require` to connection string     |
| `Schema 'public' not found` | Run: `CREATE SCHEMA IF NOT EXISTS public;`      |
| `prisma db push` fails      | Check permissions, verify database exists       |

## SQLite Path Note

For SQLite, always use pnpm scripts (not `npx prisma` directly):

```bash
pnpm db:push     # Correct
npx prisma db push  # Wrong - resolves path from prisma/ directory
```
