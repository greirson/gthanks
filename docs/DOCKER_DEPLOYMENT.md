# Docker Deployment Guide

## Overview

gthanks is designed for simple, self-hosted deployment using Docker and Docker Compose. This guide covers both SQLite (simple) and PostgreSQL (production) deployments.

## Quick Start (SQLite)

The simplest way to deploy gthanks for personal/family use:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/gthanks.git
cd gthanks

# 2. Set required environment variable
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# 3. Start the application
docker compose up -d

# 4. Visit http://localhost:3000
```

**What you get:**
- Single container deployment
- SQLite database (stored in `./data/gthanks.db`)
- Simple backup: `cp data/gthanks.db backup.db`
- Perfect for families and small groups (< 100 users)

## Production Deployment (PostgreSQL)

For larger deployments with higher traffic:

```bash
# 1. Set required environment variables
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 32)

# 2. Start PostgreSQL stack
docker compose -f docker-compose.postgres.yml up -d

# 3. Visit http://localhost:3000
```

**What you get:**
- Separate PostgreSQL container
- Production-grade database with connection pooling
- Better performance for high traffic (100s-1000s of users)
- Professional backup/restore options

## Environment Variables

### Required

```env
# Authentication secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-here

# Application URL
NEXTAUTH_URL=http://localhost:3000  # Change for production
```

### Optional - OAuth Providers

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-app-id
FACEBOOK_CLIENT_SECRET=your-app-secret

# Apple OAuth
APPLE_ID=your-service-id
APPLE_SECRET=your-private-key

# Generic OIDC Provider
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ISSUER=https://your-provider.com
```

### Optional - Email

```env
EMAIL_FROM=noreply@gthanks.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Optional - Monitoring (Production)

```env
SENTRY_DSN=https://...@sentry.io/...
```

## Docker Compose Files

### SQLite Deployment (docker-compose.yml)

```yaml
version: '3.8'

services:
  app:
    image: gthanks:latest
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/gthanks.db
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # OAuth providers (optional)
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - FACEBOOK_CLIENT_ID=${FACEBOOK_CLIENT_ID}
      - FACEBOOK_CLIENT_SECRET=${FACEBOOK_CLIENT_SECRET}
      # Email (optional)
      - EMAIL_FROM=${EMAIL_FROM}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    restart: unless-stopped
```

### PostgreSQL Deployment (docker-compose.postgres.yml)

```yaml
version: '3.8'

services:
  app:
    image: gthanks:latest
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://gthanks:${POSTGRES_PASSWORD}@postgres:5432/gthanks
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # OAuth providers (optional)
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      # Email (optional)
      - EMAIL_FROM=${EMAIL_FROM}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=gthanks
      - POSTGRES_USER=gthanks
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gthanks"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

## Cross-Platform Compatibility

gthanks Docker images work on all modern platforms:

**Supported Platforms:**
- Apple Silicon (M1/M2/M3/M4 Macs)
- Intel/AMD (x86_64)
- Linux ARM64
- Linux AMD64

**Key Features:**
- Automatic platform detection
- Runtime Prisma Client generation (handles SQLite/PostgreSQL detection)
- No manual configuration needed

The included `docker-entrypoint.sh` script automatically:
1. Detects database type from `DATABASE_URL`
2. Updates Prisma schema provider if needed
3. Generates appropriate Prisma Client
4. Runs database migrations
5. Starts the application

## Data Persistence

### SQLite Deployment

```bash
# Database location
./data/gthanks.db

# Uploads location
./uploads/

# Backup
cp -r data/ uploads/ backup-$(date +%Y%m%d)/

# Restore
cp backup-20240115/data/gthanks.db data/
cp -r backup-20240115/uploads/* uploads/
```

### PostgreSQL Deployment

```bash
# Database backup
docker exec gthanks-postgres pg_dump -U gthanks gthanks > backup.sql

# Database restore
cat backup.sql | docker exec -i gthanks-postgres psql -U gthanks gthanks

# Uploads backup (same as SQLite)
cp -r uploads/ backup-uploads-$(date +%Y%m%d)/
```

## Updating gthanks

### Pull Latest Code

```bash
# Pull latest changes
git pull origin main

# Rebuild Docker image
docker compose build

# Restart with new image
docker compose up -d
```

### Database Migrations

Migrations run automatically on container startup via `docker-entrypoint.sh`. The script:
1. Generates Prisma Client
2. Runs `prisma db push` to apply schema changes
3. Starts the application

**Manual migration (if needed):**
```bash
docker compose exec app npx prisma db push
```

## Monitoring & Logs

### View Logs

```bash
# Follow logs in real-time
docker compose logs -f app

# View last 100 lines
docker logs gthanks-app --tail=100

# Filter for errors
docker logs gthanks-app 2>&1 | grep ERROR
```

### Health Check

```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response
{
  "database": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Reverse Proxy Setup (Production)

### Nginx

```nginx
server {
    listen 80;
    server_name gthanks.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gthanks.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/gthanks.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gthanks.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase upload size for images
    client_max_body_size 10M;
}
```

### Traefik

```yaml
# docker-compose.traefik.yml
version: '3.8'

services:
  app:
    image: gthanks:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.gthanks.rule=Host(`gthanks.yourdomain.com`)"
      - "traefik.http.routers.gthanks.entrypoints=websecure"
      - "traefik.http.routers.gthanks.tls.certresolver=letsencrypt"
      - "traefik.http.services.gthanks.loadbalancer.server.port=3000"
    networks:
      - traefik

networks:
  traefik:
    external: true
```

## Security Best Practices

### 1. Use Strong Secrets

```bash
# Generate strong secrets
NEXTAUTH_SECRET=$(openssl rand -base64 48)
POSTGRES_PASSWORD=$(openssl rand -base64 48)
```

### 2. Enable HTTPS

Use Let's Encrypt for free SSL certificates:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d gthanks.yourdomain.com
```

### 3. Firewall Configuration

```bash
# Allow only HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 4. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose pull
docker compose up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker compose logs app

# Common issues:
# - Missing NEXTAUTH_SECRET
# - Invalid DATABASE_URL
# - Port 3000 already in use
```

### Database Connection Errors

```bash
# PostgreSQL: Check if database is ready
docker compose ps postgres

# Check database connectivity
docker compose exec postgres pg_isready -U gthanks

# Restart database
docker compose restart postgres
```

### Prisma Client Errors

```bash
# Regenerate Prisma Client
docker compose exec app npx prisma generate

# Push schema changes
docker compose exec app npx prisma db push

# Restart container
docker compose restart app
```

### Permission Errors

```bash
# Fix ownership of data directory
sudo chown -R $(id -u):$(id -g) data/ uploads/

# Fix permissions
chmod -R 755 data/ uploads/
```

## Performance Tuning

### PostgreSQL Connection Pooling

```env
# Adjust connection pool size in DATABASE_URL
DATABASE_URL=postgresql://gthanks:password@postgres:5432/gthanks?connection_limit=20
```

### Node.js Memory Limits

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - NODE_OPTIONS=--max-old-space-size=2048
```

### Image Caching

Enable Next.js image caching:

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - next_cache:/app/.next/cache

volumes:
  next_cache:
```

## Scaling Considerations

### Horizontal Scaling (Future)

For larger deployments (10,000+ users):

1. **Database**: Use managed PostgreSQL (AWS RDS, Digital Ocean, etc.)
2. **Uploads**: Move to S3-compatible storage (AWS S3, Minio, etc.)
3. **Rate Limiting**: Use Valkey/Redis for distributed rate limiting
4. **Load Balancer**: Deploy multiple app containers behind nginx/Traefik

```yaml
# docker-compose.scaled.yml
services:
  app:
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=postgresql://...  # Managed database
      - REDIS_URL=redis://redis:6379   # For rate limiting
      - UPLOAD_BUCKET=s3://gthanks-uploads  # S3 storage
```

## Migration from SQLite to PostgreSQL

See [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) for detailed migration instructions.

## Support

For deployment issues:
- Check logs: `docker compose logs app`
- Review health check: `curl http://localhost:3000/api/health`
- Open GitHub issue: https://github.com/yourusername/gthanks/issues
