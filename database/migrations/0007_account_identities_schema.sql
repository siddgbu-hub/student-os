-- Migration: 0007_account_identities_schema.sql
-- Description: Create account_identities table for OAuth provider identity tracking (e.g. Google sub)

CREATE TABLE IF NOT EXISTS account_identities (
  identity_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  UNIQUE(provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_account_identities_account ON account_identities(account_id);
CREATE INDEX IF NOT EXISTS idx_account_identities_provider_sub ON account_identities(provider, provider_subject);
