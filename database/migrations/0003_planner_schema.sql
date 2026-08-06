-- Migration: 0003_planner_schema.sql
-- Description: Planner Module Schema for Study Blocks / Tasks and Audit Logs

CREATE TABLE IF NOT EXISTS planner_tasks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  chapter_id TEXT,
  title TEXT NOT NULL,
  planned_date TEXT NOT NULL,
  planned_start_time TEXT,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_account ON planner_tasks(account_id);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_date ON planner_tasks(account_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_subject ON planner_tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_status ON planner_tasks(account_id, status);

CREATE TABLE IF NOT EXISTS planner_task_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES planner_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planner_logs_task ON planner_task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_planner_logs_account ON planner_task_logs(account_id);
