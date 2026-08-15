-- Migration: 0013_update_owner_whatsapp_contact.sql
-- Description: Update centralized Owner WhatsApp contact to +919793593183

INSERT INTO app_config (key, value, updated_at)
VALUES ('owner_whatsapp', '+919793593183', '2026-08-15T00:00:00.000Z')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at;
