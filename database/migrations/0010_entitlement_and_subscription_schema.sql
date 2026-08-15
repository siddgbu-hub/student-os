-- Migration: 0010_entitlement_and_subscription_schema.sql
-- Description: Plans, Subscriptions, Entitlements, Audit Logs, and App Configuration

-- 1. Plans Table
CREATE TABLE IF NOT EXISTS plans (
  plan_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  duration_days INTEGER, -- NULL for unlimited/free
  features TEXT NOT NULL DEFAULT '[]', -- JSON array of feature keys
  is_active INTEGER NOT NULL DEFAULT 1,
  payment_provider_product_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);

-- Seed Default Plans
INSERT OR IGNORE INTO plans (plan_id, name, description, price_cents, currency, duration_days, features, is_active, payment_provider_product_id, created_at, updated_at)
VALUES 
  ('free', 'Student OS Free', 'Essential core study tools, planner, and basic revision', 0, 'INR', NULL, '["core_study", "planner", "revision", "basic_analytics"]', 1, NULL, '2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z'),
  ('monthly', 'Student OS Pro Monthly', 'Full access to advanced analytics, priority AI tools, and unlimited revision queues', 29900, 'INR', 30, '["core_study", "planner", "revision", "advanced_analytics", "cloud_sync", "priority_ai"]', 1, NULL, '2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z'),
  ('yearly', 'Student OS Pro Yearly', 'Annual pro membership with discounted pricing and early access to upcoming modules', 249900, 'INR', 365, '["core_study", "planner", "revision", "advanced_analytics", "cloud_sync", "priority_ai"]', 1, NULL, '2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z');

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'active', 'expired', 'cancelled', 'revoked', 'grace_period'
  source TEXT NOT NULL, -- 'manual', 'payment'
  granted_by TEXT, -- Admin accountId, 'system', or 'gateway'
  start_date TEXT NOT NULL,
  expiry_date TEXT, -- NULL for lifetime, or ISO date
  cancelled_at TEXT,
  payment_reference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_account_status ON subscriptions(account_id, status);

-- 3. Entitlements Table (Server-Authoritative State per Account)
CREATE TABLE IF NOT EXISTS entitlements (
  entitlement_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  current_plan_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'active', 'expired', 'revoked'
  is_paid INTEGER NOT NULL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '[]',
  expires_at TEXT,
  last_verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (current_plan_id) REFERENCES plans(plan_id)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_account ON entitlements(account_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_paid ON entitlements(is_paid);

-- 4. Entitlement Audit Logs Table
CREATE TABLE IF NOT EXISTS entitlement_audit_logs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'ENTITLEMENT_MANUALLY_GRANTED', 'ENTITLEMENT_EXTENDED', 'ENTITLEMENT_REVOKED', 'ENTITLEMENT_ACTIVATED_PAYMENT'
  plan_id TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  source TEXT NOT NULL, -- 'manual', 'payment'
  start_date TEXT NOT NULL,
  expiry_date TEXT,
  details TEXT, -- JSON metadata
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entitlement_audit_account ON entitlement_audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_created ON entitlement_audit_logs(created_at);

-- 5. Application Configuration Table (Server-Side Controls)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seed Payment Live Toggle (Default: OFF)
INSERT OR IGNORE INTO app_config (key, value, updated_at)
VALUES ('payment_live', 'false', '2026-08-15T00:00:00.000Z');
