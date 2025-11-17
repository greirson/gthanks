# syntax=docker/dockerfile:1.4
# Multi-stage build for optimized production image with BuildKit cache mounts

# Base stage with system dependencies
FROM node:20-slim AS base
# Install dependencies for native modules and runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    openssl \
    curl \
    gosu \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install pnpm once in base stage
RUN npm install -g pnpm@10

# Dependencies stage
FROM base AS deps
# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Set build-time database config for Prisma generation during install
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
# Skip Prisma postinstall generation (we'll do it explicitly in builder stage)
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# Install dependencies with cache mount for pnpm store
# This persists the pnpm cache between builds, dramatically speeding up rebuilds
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (only once, not in deps stage)
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm build

# Production stage
FROM node:20-slim AS runner
WORKDIR /app

# Install only runtime dependencies (OpenSSL for Prisma, curl for health checks, gosu for privilege dropping)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files for standalone mode with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema for runtime modification (SQLite/PostgreSQL switching)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy complete Prisma packages for runtime generation (SQLite support)
# Remove the standalone's incomplete .pnpm first, then copy complete version from builder
# This includes generator-build/ infrastructure needed for runtime schema switching
RUN rm -rf /app/node_modules/.pnpm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm

# Create .bin directory and Prisma CLI wrapper script (version-agnostic)
RUN mkdir -p node_modules/.bin && \
    PRISMA_BIN=$(find node_modules/.pnpm -type f -name "index.js" -path "*/prisma/build/*" -not -path "*/public/*" | head -1) && \
    echo '#!/bin/sh' > node_modules/.bin/prisma && \
    echo "exec node /app/$PRISMA_BIN \"\$@\"" >> node_modules/.bin/prisma && \
    chmod +x node_modules/.bin/prisma && \
    chown -R nextjs:nodejs node_modules/.bin

# Copy startup script with correct ownership and permissions
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOME=/app
ENV npm_config_cache=/tmp/.npm

# Create data directory for SQLite (if used)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})" || exit 1

# Start the application with initialization
ENTRYPOINT ["./docker-entrypoint.sh"]
