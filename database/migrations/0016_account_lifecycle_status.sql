-- Migration: 0016_account_lifecycle_status.sql
-- Description: Add lifecycle status, deleted_at, and deleted_by fields to accounts table

ALTER TABLE accounts ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE accounts ADD COLUMN deleted_at TEXT;
ALTER TABLE accounts ADD COLUMN deleted_by TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
