-- One-time setup for existing production databases
-- Run this ONCE on databases that existed before migration system
-- Usage: sqlite3 /path/to/production.db < scripts/baseline-existing-db.sql

CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id TEXT PRIMARY KEY NOT NULL,
    checksum TEXT NOT NULL,
    finished_at DATETIME,
    migration_name TEXT NOT NULL,
    logs TEXT,
    rolled_back_at DATETIME,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('0_baseline', 'baseline_checksum', datetime('now'), '0_baseline', 1);
