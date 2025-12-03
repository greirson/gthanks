-- CreateTable: Personal Access Tokens for API authentication
-- Note: Other schema changes (sortOrder, purchasedAt, etc.) were applied via db:push
-- and are already present in production databases.

CREATE TABLE IF NOT EXISTS "personal_access_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "expiresAt" TIMESTAMP,
    "deviceType" TEXT,
    "lastUsedAt" TIMESTAMP,
    "lastUsedIp" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdIp" TEXT,
    "revokedAt" TIMESTAMP,
    CONSTRAINT "personal_access_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex (idempotent - will fail silently if exists)
CREATE UNIQUE INDEX IF NOT EXISTS "personal_access_tokens_accessTokenHash_key" ON "personal_access_tokens"("accessTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "personal_access_tokens_tokenPrefix_key" ON "personal_access_tokens"("tokenPrefix");
CREATE INDEX IF NOT EXISTS "personal_access_tokens_userId_revokedAt_idx" ON "personal_access_tokens"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "personal_access_tokens_expiresAt_idx" ON "personal_access_tokens"("expiresAt");

-- Ensure other indexes exist (may already be present from db:push)
CREATE INDEX IF NOT EXISTS "ListWish_listId_sortOrder_idx" ON "ListWish"("listId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_wishId_userId_key" ON "Reservation"("wishId", "userId");
