-- Migration: 0014_socc_admin_roles_and_payments.sql
-- Description: Create admin_roles and payments tables for Student OS Command Center (SOCC) V1

CREATE TABLE IF NOT EXISTS admin_roles (
  account_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'owner',
  permissions TEXT NOT NULL DEFAULT '["*"]',
  granted_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON admin_roles(role);

CREATE TABLE IF NOT EXISTS payments (
  payment_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  subscription_id TEXT,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  transaction_reference TEXT UNIQUE,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);

-- Seed default owner role for existing owner account if present
INSERT INTO admin_roles (account_id, role, permissions, granted_by, created_at, updated_at)
SELECT account_id, 'owner', '["*"]', 'system:init', '2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z'
FROM accounts
WHERE LOWER(email) = 'sidd.gbu@gmail.com'
ON CONFLICT(account_id) DO NOTHING;
