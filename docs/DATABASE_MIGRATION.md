# Database Migration Guide: SQLite to PostgreSQL

This guide explains how to migrate from SQLite (development) to PostgreSQL (production).

## Why PostgreSQL for Production?

- **Concurrent Users**: PostgreSQL handles multiple simultaneous connections efficiently
- **Data Integrity**: Better transaction support and ACID compliance
- **Scalability**: Handles larger datasets and more complex queries
- **Production Ready**: Industry standard for web applications

SQLite is excellent for local development but not suitable for production with concurrent users.

## Migration Steps

### 1. Set Up PostgreSQL Database

Choose a PostgreSQL provider:

**Option A: Neon (Recommended for Serverless)**
```bash
# Sign up at https://neon.tech
# Create new project
# Copy connection string
```

**Option B: Supabase**
```bash
# Sign up at https://supabase.com
# Create new project
# Go to Project Settings > Database
# Copy connection string (use "Connection pooling" for production)
```

**Option C: Railway**
```bash
# Sign up at https://railway.app
# Add PostgreSQL service
# Copy connection string from Variables tab
```

**Option D: Local PostgreSQL**
```bash
# Install PostgreSQL
brew install postgresql@15  # macOS
# or use Docker:
docker run --name gthanks-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=gthanks \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Update Prisma Schema

Edit `/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 3. Update Environment Variables

Update your `.env` or production environment:

```env
# Production PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/gthanks?schema=public

# Keep other variables
NEXTAUTH_SECRET=your-32-character-secret
NEXTAUTH_URL=https://your-production-domain.com
```

### 4. Generate Prisma Client

```bash
pnpm prisma generate
```

This regenerates the Prisma client for PostgreSQL.

### 5. Create Database Tables

```bash
pnpm db:push
```

This creates all tables in your PostgreSQL database.

### 6. Verify Migration

```bash
# Check tables were created
pnpm prisma studio

# Or connect directly to PostgreSQL
psql $DATABASE_URL -c "\dt"
```

### 7. Migrate Data (Optional)

If you have existing SQLite data to migrate:

```bash
# Export from SQLite
npx prisma db pull --schema=prisma/schema.sqlite.prisma
npx prisma generate --schema=prisma/schema.sqlite.prisma

# Then manually export/import data or use a migration script
# This is typically not needed for new deployments
```

## Important Differences

### Data Types

Prisma handles most differences automatically, but be aware:

| SQLite | PostgreSQL | Notes |
|--------|------------|-------|
| TEXT | VARCHAR/TEXT | No change needed |
| INTEGER | INTEGER | No change needed |
| REAL | DOUBLE PRECISION | No change needed |
| BLOB | BYTEA | No change needed |

### Indexes

Both databases support the indexes defined in your schema. No changes needed.

### Queries

All Prisma queries are database-agnostic. Your application code works without changes.

## Common Issues

### Issue: Connection Refused

**Symptom**: `Error: Can't reach database server`

**Solution**:
1. Verify PostgreSQL is running
2. Check connection string is correct
3. Ensure firewall allows connections
4. For cloud providers, check IP allowlist

### Issue: SSL Required

**Symptom**: `Error: SSL connection required`

**Solution**: Add `?sslmode=require` to connection string:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public&sslmode=require
```

### Issue: Schema Not Found

**Symptom**: `Error: Schema 'public' does not exist`

**Solution**: PostgreSQL should create the `public` schema automatically. If not:
```sql
CREATE SCHEMA IF NOT EXISTS public;
```

### Issue: Migration Fails

**Symptom**: `npx prisma db push` fails

**Solution**:
1. Check database permissions (user needs CREATE TABLE)
2. Verify database exists
3. Check connection string format
4. Try: `npx prisma db push --force-reset` (WARNING: deletes all data)

## Connection Pooling (Production)

For production deployments, use connection pooling:

**Neon**: Use pooled connection string
```env
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/gthanks
```

**Supabase**: Use connection pooling port (6543)
```env
DATABASE_URL=postgresql://postgres:pass@db.xxx.supabase.co:6543/postgres
```

**PgBouncer** (self-hosted):
```bash
# Install PgBouncer
brew install pgbouncer

# Configure and point your app to PgBouncer instead
DATABASE_URL=postgresql://user:pass@localhost:6432/gthanks
```

## Performance Optimization

### Enable Connection Pooling in Prisma

For serverless deployments (Vercel, Netlify), add to `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // For migrations
}
```

Then in `.env`:
```env
DATABASE_URL=postgresql://pooled-connection
DIRECT_URL=postgresql://direct-connection
```

### Index Optimization

The schema already includes optimal indexes. Monitor slow queries:

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Rollback Plan

If you need to revert to SQLite:

1. Update `prisma/schema.prisma`:
   ```prisma
   provider = "sqlite"
   ```

2. Update `.env`:
   ```env
   DATABASE_URL=file:./data/gthanks.db
   ```

3. Regenerate client:
   ```bash
   pnpm prisma generate
   pnpm db:push
   ```

## Testing the Migration

Before deploying to production:

1. **Create staging environment** with PostgreSQL
2. **Test all features**:
   - User authentication
   - Wish creation and editing
   - List sharing
   - Group management
   - Reservations
3. **Load test** with expected concurrent users
4. **Monitor** for errors or performance issues

## Deployment Checklist

- [ ] PostgreSQL database created
- [ ] Connection string configured
- [ ] `prisma/schema.prisma` updated to `postgresql`
- [ ] Environment variables updated
- [ ] `pnpm db:push` completed successfully
- [ ] Database tables verified
- [ ] Application tested in staging
- [ ] Backup strategy configured
- [ ] Monitoring set up
- [ ] Connection pooling enabled
- [ ] SSL/TLS configured

## Support

For database issues:

1. Check connection string format
2. Verify database server is accessible
3. Review Prisma error messages
4. Check PostgreSQL logs
5. Consult provider documentation (Neon, Supabase, etc.)

## Resources

- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Neon Documentation](https://neon.tech/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
