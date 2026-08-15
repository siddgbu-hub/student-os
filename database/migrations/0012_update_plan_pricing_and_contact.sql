-- Migration: 0012_update_plan_pricing_and_contact.sql
-- Description: Update commercial pricing (Monthly: ₹30, Yearly: ₹299) and configure owner WhatsApp contact

-- 1. Update Monthly Plan Pricing to ₹30 (3000 paise)
UPDATE plans
SET
  price_cents = 3000,
  updated_at = '2026-08-15T00:00:00.000Z'
WHERE plan_id = 'monthly';

-- 2. Update Yearly Plan Pricing to ₹299 (29900 paise)
UPDATE plans
SET
  price_cents = 29900,
  updated_at = '2026-08-15T00:00:00.000Z'
WHERE plan_id = 'yearly';

-- 3. Configure default Owner WhatsApp contact in app_config
INSERT INTO app_config (key, value, updated_at)
VALUES ('owner_whatsapp', '+919876543210', '2026-08-15T00:00:00.000Z')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at;
