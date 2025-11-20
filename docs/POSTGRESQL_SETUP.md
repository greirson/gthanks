# PostgreSQL Setup - Quick Reference

This is a quick reference for setting up PostgreSQL for production. For detailed migration instructions, see [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md).

## Quick Setup (5 Steps)

### 1. Get PostgreSQL Connection String

Choose a provider and copy your connection string:

**Neon** (Serverless, Free Tier)

```
https://neon.tech → New Project → Copy connection string
```

**Supabase** (Free Tier)

```
https://supabase.com → New Project → Settings → Database → Connection Pooling
```

**Railway** (Pay-as-you-go)

```
https://railway.app → New → PostgreSQL → Variables → DATABASE_URL
```

### 2. Update Prisma Schema

Edit `prisma/schema.prisma` line 17:

```diff
- provider = "sqlite"
+ provider = "postgresql"
```

### 3. Set Environment Variable

Production environment:

```env
DATABASE_URL=postgresql://user:password@host:5432/gthanks?schema=public
```

### 4. Generate Client & Push Schema

```bash
pnpm prisma generate
pnpm db:push
```

### 5. Verify

```bash
pnpm prisma studio
# Check that tables exist and are accessible
```

## Environment-Specific Configuration

### Local Development (SQLite)

```env
DATABASE_URL=file:./data/gthanks.db
```

```prisma
provider = "sqlite"
```

### Production (PostgreSQL)

```env
DATABASE_URL=postgresql://user:pass@host:5432/gthanks?schema=public
```

```prisma
provider = "postgresql"
```

## Common Connection Strings

### Neon

```
postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/gthanks?sslmode=require
```

### Supabase (with pooling)

```
postgresql://postgres:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

### Railway

```
postgresql://postgres:pass@containers-us-west-xxx.railway.app:6543/railway
```

### Docker (local testing)

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=yourpass \
  -e POSTGRES_DB=gthanks \
  -p 5432:5432 \
  postgres:15

# Connection string
DATABASE_URL=postgresql://postgres:yourpass@localhost:5432/gthanks
```

## Troubleshooting

### Schema validation fails

**Error**: `the URL must start with the protocol postgresql://`

**Fix**: Make sure both `prisma/schema.prisma` provider AND DATABASE_URL match:

- provider = "postgresql" → DATABASE_URL must start with postgresql://
- provider = "sqlite" → DATABASE_URL must start with file:

### Connection refused

**Error**: `Can't reach database server`

**Fix**:

1. Check firewall/network settings
2. Verify connection string is correct
3. Ensure database is running
4. For cloud providers, check IP allowlist

### SSL required

**Error**: `SSL connection required`

**Fix**: Add to connection string:

```
?sslmode=require
```

### Too many connections

**Error**: `remaining connection slots reserved`

**Fix**: Use connection pooling (port 6543 for Supabase, pooled connection for Neon)

## Performance Tips

1. **Use connection pooling** for serverless deployments
2. **Enable prepared statements** (enabled by default in Prisma)
3. **Monitor slow queries** via provider dashboard
4. **Add indexes** for frequently queried fields (already done in schema)

## Security Checklist

- [ ] Use strong database password (16+ characters)
- [ ] Enable SSL/TLS (sslmode=require)
- [ ] Restrict database access by IP (if possible)
- [ ] Use environment variables for credentials (never hardcode)
- [ ] Enable connection pooling for production
- [ ] Set up database backups
- [ ] Monitor for unauthorized access

## Next Steps

After PostgreSQL is set up:

1. Test all application features
2. Set up automated backups
3. Configure monitoring/alerts
4. Document connection details securely
5. Set up staging environment

## Resources

- [Full Migration Guide](./DATABASE_MIGRATION.md)
- [Prisma PostgreSQL Docs](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Neon Quickstart](https://neon.tech/docs/get-started-with-neon)
- [Supabase Database Setup](https://supabase.com/docs/guides/database)
