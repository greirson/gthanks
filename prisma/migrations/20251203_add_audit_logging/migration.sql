-- CreateTable: Audit Logs for comprehensive activity tracking
-- Stores all security, user, content, and admin events for compliance and debugging

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Actor information
    "actorId" TEXT,
    "actorName" TEXT,
    "actorType" TEXT NOT NULL,

    -- Action information
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    -- Resource information
    "resourceType" TEXT,
    "resourceId" TEXT,
    "resourceName" TEXT,

    -- Additional details (JSON string)
    "details" TEXT,

    -- Request context (security events only)
    "ipAddress" TEXT,
    "userAgent" TEXT
);

-- CreateTable: Audit Log Settings for configurable logging
CREATE TABLE IF NOT EXISTS "audit_log_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "authEnabled" BOOLEAN NOT NULL DEFAULT true,
    "userManagementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "contentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "adminEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndexes: Optimized for common query patterns
-- Primary query: recent logs (dashboard view)
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- Category filter: filter by auth/user/content/admin
CREATE INDEX IF NOT EXISTS "audit_logs_category_timestamp_idx" ON "audit_logs"("category", "timestamp" DESC);

-- Actor lookup: find all actions by a specific user
CREATE INDEX IF NOT EXISTS "audit_logs_actorId_timestamp_idx" ON "audit_logs"("actorId", "timestamp" DESC);

-- Insert default settings row (idempotent)
INSERT OR IGNORE INTO "audit_log_settings" ("id", "authEnabled", "userManagementEnabled", "contentEnabled", "adminEnabled", "updatedAt")
VALUES ('default', true, true, true, true, CURRENT_TIMESTAMP);
