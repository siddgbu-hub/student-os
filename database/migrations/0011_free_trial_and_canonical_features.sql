-- Migration: 0011_free_trial_and_canonical_features.sql
-- Description: Update plans to 7-Day Free Trial and canonical full-access feature set

-- 1. Insert or update the 7-day free trial plan
INSERT INTO plans (
  plan_id, name, description, price_cents, currency, duration_days, features, is_active, created_at, updated_at
) VALUES (
  'free_trial',
  '7-Day Free Trial',
  'Full access to all Student OS features for 7 days',
  0,
  'INR',
  7,
  '["dashboard", "goals", "study", "planner", "revision", "analytics", "account", "cloud_sync"]',
  1,
  '2026-08-15T00:00:00.000Z',
  '2026-08-15T00:00:00.000Z'
)
ON CONFLICT(plan_id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  duration_days = excluded.duration_days,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at;

-- 2. Update monthly plan with canonical full-access features
UPDATE plans
SET
  description = 'Full access to all Student OS features with monthly renewal',
  features = '["dashboard", "goals", "study", "planner", "revision", "analytics", "account", "cloud_sync"]',
  updated_at = '2026-08-15T00:00:00.000Z'
WHERE plan_id = 'monthly';

-- 3. Update yearly plan with canonical full-access features
UPDATE plans
SET
  description = 'Full access to all Student OS features with yearly renewal',
  features = '["dashboard", "goals", "study", "planner", "revision", "analytics", "account", "cloud_sync"]',
  updated_at = '2026-08-15T00:00:00.000Z'
WHERE plan_id = 'yearly';

-- 4. Mark legacy free tier inactive
UPDATE plans
SET
  is_active = 0,
  updated_at = '2026-08-15T00:00:00.000Z'
WHERE plan_id = 'free';
