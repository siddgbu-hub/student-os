-- Migration: 0015_payment_discount_provenance.sql
-- Description: Add discount provenance columns to payments table for SOCC V1 discount model

ALTER TABLE payments ADD COLUMN original_amount_paise INTEGER DEFAULT NULL;
ALTER TABLE payments ADD COLUMN discount_percent INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN discount_amount_paise INTEGER DEFAULT 0;
