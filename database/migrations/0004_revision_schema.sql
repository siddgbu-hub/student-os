-- Migration: 0004_revision_schema.sql
-- Description: Revision Module Schema for Revision Items, Revision Sessions, and Audit Logs

CREATE TABLE IF NOT EXISTS revision_items (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  chapter_id TEXT,
  originating_study_session_id TEXT,
  scheduled_date TEXT NOT NULL,
  revision_stage INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'scheduled',
  priority TEXT NOT NULL DEFAULT 'medium',
  notes TEXT,
  total_revision_count INTEGER NOT NULL DEFAULT 0,
  retention_score INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_revision_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
  FOREIGN KEY (originating_study_session_id) REFERENCES study_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_revision_items_account ON revision_items(account_id);
CREATE INDEX IF NOT EXISTS idx_revision_items_date ON revision_items(account_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_revision_items_status ON revision_items(account_id, status);
CREATE INDEX IF NOT EXISTS idx_revision_items_subject ON revision_items(subject_id);

CREATE TABLE IF NOT EXISTS revision_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  revision_item_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  chapter_id TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  pause_duration_seconds INTEGER NOT NULL DEFAULT 0,
  revision_stage INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (revision_item_id) REFERENCES revision_items(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_revision_sessions_account ON revision_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_revision_sessions_item ON revision_sessions(revision_item_id);
CREATE INDEX IF NOT EXISTS idx_revision_sessions_subject ON revision_sessions(subject_id);

CREATE TABLE IF NOT EXISTS revision_item_logs (
  id TEXT PRIMARY KEY,
  revision_item_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (revision_item_id) REFERENCES revision_items(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revision_logs_item ON revision_item_logs(revision_item_id);
CREATE INDEX IF NOT EXISTS idx_revision_logs_account ON revision_item_logs(account_id);
