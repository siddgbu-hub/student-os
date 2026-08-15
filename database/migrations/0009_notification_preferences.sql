-- Migration: 0009_notification_preferences.sql
-- Description: Add notification preference fields to user_preferences table

ALTER TABLE user_preferences ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_preferences ADD COLUMN planner_reminders_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_preferences ADD COLUMN revision_reminders_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_preferences ADD COLUMN quiet_hours_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN quiet_hours_start TEXT NOT NULL DEFAULT '22:00';
ALTER TABLE user_preferences ADD COLUMN quiet_hours_end TEXT NOT NULL DEFAULT '07:00';
ALTER TABLE user_preferences ADD COLUMN reminder_lead_time_minutes INTEGER NOT NULL DEFAULT 15;
ALTER TABLE user_preferences ADD COLUMN show_private_details_in_notifications INTEGER NOT NULL DEFAULT 0;
