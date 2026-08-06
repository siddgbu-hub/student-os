-- Migration: 0005_account_schema.sql
-- Description: Create user_profiles and user_preferences tables for User Account Module

CREATE TABLE IF NOT EXISTS user_profiles (
  account_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'Student',
  avatar_url TEXT,
  institution_name TEXT,
  course TEXT,
  class_year TEXT,
  stream TEXT,
  examination_type TEXT,
  preferred_daily_study_target_minutes INTEGER NOT NULL DEFAULT 120,
  preferred_session_duration_minutes INTEGER NOT NULL DEFAULT 45,
  preferred_study_time TEXT NOT NULL DEFAULT 'morning',
  preferred_revision_strategy TEXT NOT NULL DEFAULT 'spaced',
  preferred_planner_view TEXT NOT NULL DEFAULT 'day',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_preferences (
  account_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'system',
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format TEXT NOT NULL DEFAULT '24h',
  first_day_of_week TEXT NOT NULL DEFAULT 'monday',
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  show_completed_blocks INTEGER NOT NULL DEFAULT 1,
  break_reminder_interval_minutes INTEGER NOT NULL DEFAULT 50,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);
