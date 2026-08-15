-- Migration: 0008_revision_confidence_rating.sql
-- Description: Add confidence rating columns to revision_sessions and revision_items

ALTER TABLE revision_sessions ADD COLUMN rating TEXT CHECK(rating IN ('again', 'hard', 'good', 'easy') OR rating IS NULL);
ALTER TABLE revision_items ADD COLUMN last_rating TEXT CHECK(last_rating IN ('again', 'hard', 'good', 'easy') OR last_rating IS NULL);
ALTER TABLE revision_items ADD COLUMN lapse_count INTEGER NOT NULL DEFAULT 0;
