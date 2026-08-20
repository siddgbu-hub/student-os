-- Migration: 0017_trial_claims.sql
-- Description: Create trial_claims table to prevent trial reset after account deletion

CREATE TABLE IF NOT EXISTS trial_claims (
  claim_id TEXT PRIMARY KEY,
  email_hash TEXT UNIQUE NOT NULL,
  first_claimed_at TEXT NOT NULL,
  trial_expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trial_claims_email_hash ON trial_claims(email_hash);
