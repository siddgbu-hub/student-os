
-- Student OS Development Seed Data
-- Target Account: student@example.com

-- Cleanup previous demo data for student@example.com
DELETE FROM revision_item_logs WHERE account_id = 'acc-student-demo-001';
DELETE FROM revision_sessions WHERE account_id = 'acc-student-demo-001';
DELETE FROM revision_items WHERE account_id = 'acc-student-demo-001';
DELETE FROM planner_task_logs WHERE account_id = 'acc-student-demo-001';
DELETE FROM planner_tasks WHERE account_id = 'acc-student-demo-001';
DELETE FROM study_sessions WHERE account_id = 'acc-student-demo-001';
DELETE FROM chapters WHERE account_id = 'acc-student-demo-001';
DELETE FROM subjects WHERE account_id = 'acc-student-demo-001';
DELETE FROM sessions WHERE account_id = 'acc-student-demo-001';
DELETE FROM devices WHERE account_id = 'acc-student-demo-001';
DELETE FROM accounts WHERE account_id = 'acc-student-demo-001' OR email = 'student@example.com';

-- 1. Create Demo Account & Device
INSERT INTO accounts (account_id, email, created_at, last_login_at)
VALUES ('acc-student-demo-001', 'student@example.com', '2026-07-30T04:30:00.000Z', '2026-08-06T04:30:00.000Z');

INSERT INTO devices (device_id, account_id, device_model, os_version, is_active, registered_at, last_active_at)
VALUES ('dev-student-demo-001', 'acc-student-demo-001', 'MacBook Pro', 'macOS', 1, '2026-07-30T04:30:00.000Z', '2026-08-06T04:30:00.000Z');

-- 2. Create Subjects
INSERT INTO subjects (id, account_id, name, created_at, updated_at) VALUES
('subj-math', 'acc-student-demo-001', 'Mathematics', '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('subj-phys', 'acc-student-demo-001', 'Physics', '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('subj-chem', 'acc-student-demo-001', 'Chemistry', '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('subj-eng', 'acc-student-demo-001', 'English', '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('subj-cs', 'acc-student-demo-001', 'Computer Science', '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z');

-- 3. Create Chapters
-- Mathematics
INSERT INTO chapters (id, subject_id, account_id, name, order_index, is_completed, created_at, updated_at) VALUES
('chap-math-1', 'subj-math', 'acc-student-demo-001', 'Limits', 1, 1, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-math-2', 'subj-math', 'acc-student-demo-001', 'Differentiation', 2, 1, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-math-3', 'subj-math', 'acc-student-demo-001', 'Integration', 3, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-math-4', 'subj-math', 'acc-student-demo-001', 'Matrices', 4, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-math-5', 'subj-math', 'acc-student-demo-001', 'Probability', 5, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z');

-- Physics
INSERT INTO chapters (id, subject_id, account_id, name, order_index, is_completed, created_at, updated_at) VALUES
('chap-phys-1', 'subj-phys', 'acc-student-demo-001', 'Motion', 1, 1, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-phys-2', 'subj-phys', 'acc-student-demo-001', 'Work & Energy', 2, 1, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-phys-3', 'subj-phys', 'acc-student-demo-001', 'Gravitation', 3, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-phys-4', 'subj-phys', 'acc-student-demo-001', 'Current Electricity', 4, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z');

-- Chemistry
INSERT INTO chapters (id, subject_id, account_id, name, order_index, is_completed, created_at, updated_at) VALUES
('chap-chem-1', 'subj-chem', 'acc-student-demo-001', 'Atomic Structure', 1, 1, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-chem-2', 'subj-chem', 'acc-student-demo-001', 'Chemical Bonding', 2, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-chem-3', 'subj-chem', 'acc-student-demo-001', 'Organic Chemistry', 3, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z');

-- English
INSERT INTO chapters (id, subject_id, account_id, name, order_index, is_completed, created_at, updated_at) VALUES
('chap-eng-1', 'subj-eng', 'acc-student-demo-001', 'Grammar', 1, 1, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-eng-2', 'subj-eng', 'acc-student-demo-001', 'Reading Comprehension', 2, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-eng-3', 'subj-eng', 'acc-student-demo-001', 'Essay Writing', 3, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z');

-- Computer Science
INSERT INTO chapters (id, subject_id, account_id, name, order_index, is_completed, created_at, updated_at) VALUES
('chap-cs-1', 'subj-cs', 'acc-student-demo-001', 'Arrays', 1, 1, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-cs-2', 'subj-cs', 'acc-student-demo-001', 'Linked Lists', 2, 1, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-cs-3', 'subj-cs', 'acc-student-demo-001', 'Trees', 3, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z'),
('chap-cs-4', 'subj-cs', 'acc-student-demo-001', 'Graphs', 4, 0, '2026-07-30T04:30:00.000Z', '2026-07-30T04:30:00.000Z');

-- 4. Create Study Sessions (Relative Dates)
-- Yesterday Sessions
INSERT INTO study_sessions (id, account_id, subject_id, chapter_id, start_time, end_time, duration_seconds, pause_duration_seconds, status, created_at, updated_at) VALUES
('sess-yest-1', 'acc-student-demo-001', 'subj-math', 'chap-math-3', '2026-08-05T08:30:00.000Z', '2026-08-05T09:22:00.000Z', 3120, 0, 'completed', '2026-08-05T09:22:00.000Z', '2026-08-05T09:22:00.000Z'),
('sess-yest-2', 'acc-student-demo-001', 'subj-phys', 'chap-phys-2', '2026-08-05T10:30:00.000Z', '2026-08-05T11:45:00.000Z', 4500, 0, 'completed', '2026-08-05T11:45:00.000Z', '2026-08-05T11:45:00.000Z'),
('sess-yest-3', 'acc-student-demo-001', 'subj-chem', 'chap-chem-2', '2026-08-05T13:30:00.000Z', '2026-08-05T13:50:00.000Z', 1200, 0, 'cancelled', '2026-08-05T13:50:00.000Z', '2026-08-05T13:50:00.000Z');

-- Today Sessions
INSERT INTO study_sessions (id, account_id, subject_id, chapter_id, start_time, end_time, duration_seconds, pause_duration_seconds, status, created_at, updated_at) VALUES
('sess-today-1', 'acc-student-demo-001', 'subj-chem', 'chap-chem-3', '2026-08-06T03:30:00.000Z', '2026-08-06T04:10:00.000Z', 2400, 0, 'completed', '2026-08-06T04:10:00.000Z', '2026-08-06T04:10:00.000Z'),
('sess-today-2', 'acc-student-demo-001', 'subj-cs', 'chap-cs-3', '2026-08-06T05:30:00.000Z', '2026-08-06T06:40:00.000Z', 4200, 0, 'completed', '2026-08-06T06:40:00.000Z', '2026-08-06T06:40:00.000Z'),
('sess-today-3', 'acc-student-demo-001', 'subj-eng', 'chap-eng-2', '2026-08-06T08:30:00.000Z', '2026-08-06T08:55:00.000Z', 1500, 0, 'completed', '2026-08-06T08:55:00.000Z', '2026-08-06T08:55:00.000Z'),
('sess-today-4', 'acc-student-demo-001', 'subj-math', 'chap-math-4', '2026-08-06T10:30:00.000Z', '2026-08-06T10:45:00.000Z', 900, 0, 'cancelled', '2026-08-06T10:45:00.000Z', '2026-08-06T10:45:00.000Z');

-- 2 Days Ago & 3 Days Ago Sessions
INSERT INTO study_sessions (id, account_id, subject_id, chapter_id, start_time, end_time, duration_seconds, pause_duration_seconds, status, created_at, updated_at) VALUES
('sess-2d-1', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', '2026-08-04T04:30:00.000Z', '2026-08-04T05:20:00.000Z', 3000, 0, 'completed', '2026-08-04T05:20:00.000Z', '2026-08-04T05:20:00.000Z'),
('sess-2d-2', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', '2026-08-04T09:30:00.000Z', '2026-08-04T10:15:00.000Z', 2700, 0, 'completed', '2026-08-04T10:15:00.000Z', '2026-08-04T10:15:00.000Z'),
('sess-3d-1', 'acc-student-demo-001', 'subj-math', 'chap-math-2', '2026-08-03T05:30:00.000Z', '2026-08-03T06:30:00.000Z', 3600, 0, 'completed', '2026-08-03T06:30:00.000Z', '2026-08-03T06:30:00.000Z'),
('sess-3d-2', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', '2026-08-03T10:30:00.000Z', '2026-08-03T11:00:00.000Z', 1800, 0, 'completed', '2026-08-03T11:00:00.000Z', '2026-08-03T11:00:00.000Z');

-- 5. Create Planner Tasks
INSERT INTO planner_tasks (id, account_id, subject_id, chapter_id, title, planned_date, planned_start_time, estimated_duration_minutes, priority, status, notes, created_at, updated_at, completed_at) VALUES
('task-today-1', 'acc-student-demo-001', 'subj-math', 'chap-math-3', 'Complete Integration Exercises', '2026-08-06', '09:00', 45, 'high', 'completed', 'Focus on integration by parts problems', '2026-08-06T02:30:00.000Z', '2026-08-06T04:15:00.000Z', '2026-08-06T04:15:00.000Z'),
('task-today-2', 'acc-student-demo-001', 'subj-chem', 'chap-chem-3', 'Revise Organic Chemistry Notes', '2026-08-06', '11:00', 40, 'high', 'in_progress', 'Reaction mechanisms and functional groups', '2026-08-06T02:30:00.000Z', '2026-08-06T05:30:00.000Z', NULL),
('task-today-3', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', 'Complete DSA Arrays Sheet', '2026-08-06', '14:30', 60, 'medium', 'planned', 'Two pointer & sliding window technique', '2026-08-06T02:30:00.000Z', '2026-08-06T02:30:00.000Z', NULL),
('task-today-4', 'acc-student-demo-001', 'subj-eng', 'chap-eng-2', 'Read English Chapter 4', '2026-08-06', '16:30', 30, 'low', 'planned', 'Annotate main passage arguments', '2026-08-06T02:30:00.000Z', '2026-08-06T02:30:00.000Z', NULL),
('task-tom-1', 'acc-student-demo-001', 'subj-phys', 'chap-phys-2', 'Solve Physics Numericals', '2026-08-07', '10:00', 60, 'high', 'planned', 'Work done by variable force formulas', '2026-08-06T02:30:00.000Z', '2026-08-06T02:30:00.000Z', NULL),
('task-tom-2', 'acc-student-demo-001', 'subj-cs', 'chap-cs-2', 'Implement Linked List Reversal', '2026-08-07', '14:00', 45, 'medium', 'planned', 'Iterative and recursive approaches', '2026-08-06T02:30:00.000Z', '2026-08-06T02:30:00.000Z', NULL),
('task-tom-3', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'Grammar Worksheet Practice', '2026-08-07', '16:00', 30, 'low', 'planned', 'Subject-verb agreement drills', '2026-08-06T02:30:00.000Z', '2026-08-06T02:30:00.000Z', NULL),
('task-2d-1', 'acc-student-demo-001', 'subj-math', 'chap-math-2', 'Prepare Weekly Revision', '2026-08-08', '09:30', 90, 'high', 'planned', 'Consolidate differentiation formulas', '2026-08-06T02:30:00.000Z', '2026-08-06T02:30:00.000Z', NULL),
('task-2d-2', 'acc-student-demo-001', 'subj-phys', 'chap-phys-3', 'Gravitation Formulas Review', '2026-08-08', '11:30', 45, 'medium', 'planned', 'Kepler laws and gravitational potential', '2026-08-06T02:30:00.000Z', '2026-08-06T02:30:00.000Z', NULL),
('task-3d-1', 'acc-student-demo-001', 'subj-cs', 'chap-cs-3', 'Binary Tree Traversal Problems', '2026-08-09', '10:00', 60, 'medium', 'planned', 'Inorder, Preorder, Postorder traversals', '2026-08-06T02:30:00.000Z', '2026-08-06T02:30:00.000Z', NULL),
('task-yest-1', 'acc-student-demo-001', 'subj-chem', 'chap-chem-2', 'Chemical Bonding Quiz Prep', '2026-08-05', '18:00', 45, 'medium', 'deferred', 'VSEPR theory and hybridization', '2026-08-04T02:30:00.000Z', '2026-08-05T14:30:00.000Z', NULL);

-- 6. Create Revision Items & Revision Sessions
INSERT INTO revision_items (
  id, account_id, subject_id, chapter_id, originating_study_session_id, scheduled_date,
  revision_stage, status, priority, notes, total_revision_count, retention_score,
  created_at, updated_at, last_revision_at, completed_at
) VALUES
('rev-today-1', 'acc-student-demo-001', 'subj-math', 'chap-math-3', 'sess-yest-1', '2026-08-06', 2, 'due_today', 'high', 'Integration by parts and trigonometric substitution', 1, 95, '2026-08-05T04:30:00.000Z', '2026-08-06T04:30:00.000Z', '2026-08-05T09:30:00.000Z', NULL),
('rev-today-2', 'acc-student-demo-001', 'subj-phys', 'chap-phys-2', 'sess-yest-2', '2026-08-06', 1, 'due_today', 'medium', 'Work-energy theorem & conservation laws', 0, 90, '2026-08-05T04:30:00.000Z', '2026-08-06T04:30:00.000Z', NULL, NULL),
('rev-overdue-1', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', 'sess-3d-1', '2026-08-05', 1, 'overdue', 'high', 'Bohr model & electron configuration', 0, 80, '2026-08-03T04:30:00.000Z', '2026-08-05T04:30:00.000Z', NULL, NULL),
('rev-up-1', 'acc-student-demo-001', 'subj-cs', 'chap-cs-2', 'sess-2d-1', '2026-08-07', 1, 'scheduled', 'medium', 'Linked list cycle detection', 0, 100, '2026-08-04T04:30:00.000Z', '2026-08-06T04:30:00.000Z', NULL, NULL),
('rev-comp-1', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'sess-3d-2', '2026-08-05', 4, 'completed', 'low', 'Active vs passive voice drills', 3, 100, '2026-08-01T04:30:00.000Z', '2026-08-05T04:30:00.000Z', '2026-08-05T10:30:00.000Z', '2026-08-05T10:30:00.000Z');

INSERT INTO revision_sessions (
  id, account_id, revision_item_id, subject_id, chapter_id, start_time, end_time,
  duration_seconds, pause_duration_seconds, revision_stage, status, notes, created_at, updated_at
) VALUES
('rev-sess-1', 'acc-student-demo-001', 'rev-today-1', 'subj-math', 'chap-math-3', '2026-08-05T09:30:00.000Z', '2026-08-05T09:50:00.000Z', 1200, 0, 1, 'completed', 'First recall review done', '2026-08-05T09:30:00.000Z', '2026-08-05T09:50:00.000Z'),
('rev-sess-2', 'acc-student-demo-001', 'rev-comp-1', 'subj-eng', 'chap-eng-1', '2026-08-05T10:30:00.000Z', '2026-08-05T10:45:00.000Z', 900, 0, 3, 'completed', 'Final revision completed', '2026-08-05T10:30:00.000Z', '2026-08-05T10:45:00.000Z');
