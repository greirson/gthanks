# Docker Deployment Guide

## Quick Start (SQLite)

```bash
git clone https://github.com/yourusername/gthanks.git
cd gthanks
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
docker compose up -d
# Visit http://localhost:3000
```

## Production (PostgreSQL)

```bash
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
docker compose -f docker-compose.postgres.yml up -d
```

## Environment Variables

| Variable           | Required | Description                        |
| ------------------ | -------- | ---------------------------------- |
| `NEXTAUTH_SECRET`  | Yes      | `openssl rand -base64 32`          |
| `NEXTAUTH_URL`     | Yes      | Production URL (e.g., https://...) |
| `DATABASE_URL`     | Auto     | Set by compose file                |
| `GOOGLE_CLIENT_ID` | No       | Google OAuth                       |
| `SMTP_HOST`        | No       | Email server for magic links       |

## Docker Compose Files

- `docker-compose.yml` - SQLite (simple, < 100 users)
- `docker-compose.postgres.yml` - PostgreSQL (production)

## Data Persistence

| Deployment | Database            | Uploads      |
| ---------- | ------------------- | ------------ |
| SQLite     | `./data/gthanks.db` | `./uploads/` |
| PostgreSQL | Docker volume       | `./uploads/` |

**Backup (SQLite):** `cp -r data/ uploads/ backup-$(date +%Y%m%d)/`

**Backup (PostgreSQL):** `docker exec gthanks-postgres pg_dump -U gthanks gthanks > backup.sql`

## Health Check

```bash
curl http://localhost:3000/api/health
# {"database": true, "timestamp": "..."}
```

## Updating

```bash
git pull origin main
docker compose build
docker compose up -d
```

Migrations run automatically on container startup.

## Logs

```bash
docker compose logs -f app
```

See [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) for SQLite to PostgreSQL migration.
