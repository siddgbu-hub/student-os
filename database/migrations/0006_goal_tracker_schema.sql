-- Migration: 0006_goal_tracker_schema.sql
-- Description: Create exam_goals table for Goal Tracker Module

CREATE TABLE IF NOT EXISTS exam_goals (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  exam_date TEXT NOT NULL,
  target_score TEXT,
  target_daily_minutes INTEGER NOT NULL DEFAULT 120,
  target_total_chapters INTEGER,
  completed_chapters INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exam_goals_account ON exam_goals(account_id);
CREATE INDEX IF NOT EXISTS idx_exam_goals_status ON exam_goals(status);
