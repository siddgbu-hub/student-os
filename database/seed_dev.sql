
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
DELETE FROM user_preferences WHERE account_id = 'acc-student-demo-001';
DELETE FROM user_profiles WHERE account_id = 'acc-student-demo-001';
DELETE FROM sessions WHERE account_id = 'acc-student-demo-001';
DELETE FROM devices WHERE account_id = 'acc-student-demo-001';
DELETE FROM accounts WHERE account_id = 'acc-student-demo-001' OR email = 'student@example.com';

-- 1. Create Demo Account & Device
INSERT INTO accounts (account_id, email, created_at, last_login_at)
VALUES ('acc-student-demo-001', 'student@example.com', '2026-07-09T04:30:00.000Z', '2026-08-18T04:30:00.000Z');

INSERT INTO devices (device_id, account_id, device_model, os_version, is_active, registered_at, last_active_at)
VALUES ('dev-student-demo-001', 'acc-student-demo-001', 'MacBook Pro', 'macOS', 1, '2026-07-09T04:30:00.000Z', '2026-08-18T04:30:00.000Z');

INSERT INTO user_profiles (account_id, full_name, avatar_url, institution_name, course, class_year, stream, examination_type, preferred_daily_study_target_minutes, preferred_session_duration_minutes, preferred_study_time, preferred_revision_strategy, preferred_planner_view, created_at, updated_at)
VALUES ('acc-student-demo-001', 'Alex Student', NULL, 'State University', 'B.Tech Computer Science', '3rd Year', 'Engineering', 'Final Exams', 120, 45, 'morning', 'spaced', 'day', '2026-07-09T04:30:00.000Z', '2026-08-18T04:30:00.000Z');

INSERT INTO user_preferences (account_id, theme, date_format, time_format, first_day_of_week, time_zone, show_completed_blocks, break_reminder_interval_minutes, updated_at)
VALUES ('acc-student-demo-001', 'system', 'YYYY-MM-DD', '24h', 'monday', 'UTC', 1, 50, '2026-08-18T04:30:00.000Z');

-- 2. Create Subjects
INSERT INTO subjects (id, account_id, name, created_at, updated_at) VALUES
('subj-math', 'acc-student-demo-001', 'Mathematics', '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('subj-phys', 'acc-student-demo-001', 'Physics', '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('subj-chem', 'acc-student-demo-001', 'Chemistry', '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('subj-eng', 'acc-student-demo-001', 'English', '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('subj-cs', 'acc-student-demo-001', 'Computer Science', '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z');

-- 3. Create Chapters
INSERT INTO chapters (id, subject_id, account_id, name, order_index, is_completed, created_at, updated_at) VALUES
('chap-math-1', 'subj-math', 'acc-student-demo-001', 'Limits', 1, 1, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-math-2', 'subj-math', 'acc-student-demo-001', 'Differentiation', 2, 1, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-math-3', 'subj-math', 'acc-student-demo-001', 'Integration', 3, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-math-4', 'subj-math', 'acc-student-demo-001', 'Matrices', 4, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-math-5', 'subj-math', 'acc-student-demo-001', 'Probability', 5, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-phys-1', 'subj-phys', 'acc-student-demo-001', 'Motion', 1, 1, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-phys-2', 'subj-phys', 'acc-student-demo-001', 'Work & Energy', 2, 1, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-phys-3', 'subj-phys', 'acc-student-demo-001', 'Gravitation', 3, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-phys-4', 'subj-phys', 'acc-student-demo-001', 'Current Electricity', 4, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-chem-1', 'subj-chem', 'acc-student-demo-001', 'Atomic Structure', 1, 1, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-chem-2', 'subj-chem', 'acc-student-demo-001', 'Chemical Bonding', 2, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-chem-3', 'subj-chem', 'acc-student-demo-001', 'Organic Chemistry', 3, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-eng-1', 'subj-eng', 'acc-student-demo-001', 'Grammar', 1, 1, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-eng-2', 'subj-eng', 'acc-student-demo-001', 'Reading Comprehension', 2, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-eng-3', 'subj-eng', 'acc-student-demo-001', 'Essay Writing', 3, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-cs-1', 'subj-cs', 'acc-student-demo-001', 'Arrays', 1, 1, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-cs-2', 'subj-cs', 'acc-student-demo-001', 'Linked Lists', 2, 1, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-cs-3', 'subj-cs', 'acc-student-demo-001', 'Trees', 3, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z'),
('chap-cs-4', 'subj-cs', 'acc-student-demo-001', 'Graphs', 4, 0, '2026-07-09T04:30:00.000Z', '2026-07-09T04:30:00.000Z');

-- 4. Create Recent & Historical Study Sessions
INSERT INTO study_sessions (id, account_id, subject_id, chapter_id, start_time, end_time, duration_seconds, pause_duration_seconds, status, created_at, updated_at) VALUES
('sess-yest-1', 'acc-student-demo-001', 'subj-math', 'chap-math-3', '2026-08-17T08:30:00.000Z', '2026-08-17T09:22:00.000Z', 3120, 0, 'completed', '2026-08-17T09:22:00.000Z', '2026-08-17T09:22:00.000Z'),
('sess-yest-2', 'acc-student-demo-001', 'subj-phys', 'chap-phys-2', '2026-08-17T10:30:00.000Z', '2026-08-17T11:45:00.000Z', 4500, 0, 'completed', '2026-08-17T11:45:00.000Z', '2026-08-17T11:45:00.000Z'),
('sess-today-1', 'acc-student-demo-001', 'subj-chem', 'chap-chem-3', '2026-08-18T03:30:00.000Z', '2026-08-18T04:10:00.000Z', 2400, 0, 'completed', '2026-08-18T04:10:00.000Z', '2026-08-18T04:10:00.000Z'),
('sess-today-2', 'acc-student-demo-001', 'subj-cs', 'chap-cs-3', '2026-08-18T05:30:00.000Z', '2026-08-18T06:40:00.000Z', 4200, 0, 'completed', '2026-08-18T06:40:00.000Z', '2026-08-18T06:40:00.000Z'),
('sess-today-3', 'acc-student-demo-001', 'subj-eng', 'chap-eng-2', '2026-08-18T08:30:00.000Z', '2026-08-18T08:55:00.000Z', 1500, 0, 'completed', '2026-08-18T08:55:00.000Z', '2026-08-18T08:55:00.000Z'),
('sess-2d-1', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', '2026-08-16T04:30:00.000Z', '2026-08-16T05:20:00.000Z', 3000, 0, 'completed', '2026-08-16T05:20:00.000Z', '2026-08-16T05:20:00.000Z'),
('sess-2d-2', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', '2026-08-16T09:30:00.000Z', '2026-08-16T10:15:00.000Z', 2700, 0, 'completed', '2026-08-16T10:15:00.000Z', '2026-08-16T10:15:00.000Z'),
('sess-3d-1', 'acc-student-demo-001', 'subj-math', 'chap-math-2', '2026-08-15T05:30:00.000Z', '2026-08-15T06:30:00.000Z', 3600, 0, 'completed', '2026-08-15T06:30:00.000Z', '2026-08-15T06:30:00.000Z'),
('sess-3d-2', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', '2026-08-15T10:30:00.000Z', '2026-08-15T11:00:00.000Z', 1800, 0, 'completed', '2026-08-15T11:00:00.000Z', '2026-08-15T11:00:00.000Z'),
('sess-hist-4', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', '2026-08-14T04:30:00.000Z', '2026-08-14T05:40:00.000Z', 4200, 0, 'completed', '2026-08-14T04:30:00.000Z', '2026-08-14T05:40:00.000Z'),
('sess-hist-5', 'acc-student-demo-001', 'subj-math', 'chap-math-2', '2026-08-13T04:30:00.000Z', '2026-08-13T05:00:00.000Z', 1800, 0, 'completed', '2026-08-13T04:30:00.000Z', '2026-08-13T05:00:00.000Z'),
('sess-hist-6', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', '2026-08-12T04:30:00.000Z', '2026-08-12T05:10:00.000Z', 2400, 0, 'completed', '2026-08-12T04:30:00.000Z', '2026-08-12T05:10:00.000Z'),
('sess-hist-7', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', '2026-08-11T04:30:00.000Z', '2026-08-11T05:20:00.000Z', 3000, 0, 'completed', '2026-08-11T04:30:00.000Z', '2026-08-11T05:20:00.000Z'),
('sess-hist-8', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', '2026-08-10T04:30:00.000Z', '2026-08-10T05:30:00.000Z', 3600, 0, 'completed', '2026-08-10T04:30:00.000Z', '2026-08-10T05:30:00.000Z'),
('sess-hist-9', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', '2026-08-09T04:30:00.000Z', '2026-08-09T05:40:00.000Z', 4200, 0, 'completed', '2026-08-09T04:30:00.000Z', '2026-08-09T05:40:00.000Z'),
('sess-hist-10', 'acc-student-demo-001', 'subj-math', 'chap-math-2', '2026-08-08T04:30:00.000Z', '2026-08-08T05:00:00.000Z', 1800, 0, 'completed', '2026-08-08T04:30:00.000Z', '2026-08-08T05:00:00.000Z'),
('sess-hist-11', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', '2026-08-07T04:30:00.000Z', '2026-08-07T05:10:00.000Z', 2400, 0, 'completed', '2026-08-07T04:30:00.000Z', '2026-08-07T05:10:00.000Z'),
('sess-hist-12', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', '2026-08-06T04:30:00.000Z', '2026-08-06T05:20:00.000Z', 3000, 0, 'completed', '2026-08-06T04:30:00.000Z', '2026-08-06T05:20:00.000Z'),
('sess-hist-13', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', '2026-08-05T04:30:00.000Z', '2026-08-05T05:30:00.000Z', 3600, 0, 'completed', '2026-08-05T04:30:00.000Z', '2026-08-05T05:30:00.000Z'),
('sess-hist-14', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', '2026-08-04T04:30:00.000Z', '2026-08-04T05:40:00.000Z', 4200, 0, 'completed', '2026-08-04T04:30:00.000Z', '2026-08-04T05:40:00.000Z'),
('sess-hist-15', 'acc-student-demo-001', 'subj-math', 'chap-math-2', '2026-08-03T04:30:00.000Z', '2026-08-03T05:00:00.000Z', 1800, 0, 'completed', '2026-08-03T04:30:00.000Z', '2026-08-03T05:00:00.000Z'),
('sess-hist-16', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', '2026-08-02T04:30:00.000Z', '2026-08-02T05:10:00.000Z', 2400, 0, 'completed', '2026-08-02T04:30:00.000Z', '2026-08-02T05:10:00.000Z'),
('sess-hist-17', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', '2026-08-01T04:30:00.000Z', '2026-08-01T05:20:00.000Z', 3000, 0, 'completed', '2026-08-01T04:30:00.000Z', '2026-08-01T05:20:00.000Z'),
('sess-hist-18', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', '2026-07-31T04:30:00.000Z', '2026-07-31T05:30:00.000Z', 3600, 0, 'completed', '2026-07-31T04:30:00.000Z', '2026-07-31T05:30:00.000Z'),
('sess-hist-19', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', '2026-07-30T04:30:00.000Z', '2026-07-30T05:40:00.000Z', 4200, 0, 'completed', '2026-07-30T04:30:00.000Z', '2026-07-30T05:40:00.000Z'),
('sess-hist-20', 'acc-student-demo-001', 'subj-math', 'chap-math-2', '2026-07-29T04:30:00.000Z', '2026-07-29T05:00:00.000Z', 1800, 0, 'completed', '2026-07-29T04:30:00.000Z', '2026-07-29T05:00:00.000Z'),
('sess-hist-21', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', '2026-07-28T04:30:00.000Z', '2026-07-28T05:10:00.000Z', 2400, 0, 'completed', '2026-07-28T04:30:00.000Z', '2026-07-28T05:10:00.000Z'),
('sess-hist-22', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', '2026-07-27T04:30:00.000Z', '2026-07-27T05:20:00.000Z', 3000, 0, 'completed', '2026-07-27T04:30:00.000Z', '2026-07-27T05:20:00.000Z'),
('sess-hist-23', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', '2026-07-26T04:30:00.000Z', '2026-07-26T05:30:00.000Z', 3600, 0, 'completed', '2026-07-26T04:30:00.000Z', '2026-07-26T05:30:00.000Z'),
('sess-hist-24', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', '2026-07-25T04:30:00.000Z', '2026-07-25T05:40:00.000Z', 4200, 0, 'completed', '2026-07-25T04:30:00.000Z', '2026-07-25T05:40:00.000Z'),
('sess-hist-25', 'acc-student-demo-001', 'subj-math', 'chap-math-2', '2026-07-24T04:30:00.000Z', '2026-07-24T05:00:00.000Z', 1800, 0, 'completed', '2026-07-24T04:30:00.000Z', '2026-07-24T05:00:00.000Z'),
('sess-hist-26', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', '2026-07-23T04:30:00.000Z', '2026-07-23T05:10:00.000Z', 2400, 0, 'completed', '2026-07-23T04:30:00.000Z', '2026-07-23T05:10:00.000Z'),
('sess-hist-27', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', '2026-07-22T04:30:00.000Z', '2026-07-22T05:20:00.000Z', 3000, 0, 'completed', '2026-07-22T04:30:00.000Z', '2026-07-22T05:20:00.000Z'),
('sess-hist-28', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', '2026-07-21T04:30:00.000Z', '2026-07-21T05:30:00.000Z', 3600, 0, 'completed', '2026-07-21T04:30:00.000Z', '2026-07-21T05:30:00.000Z'),
('sess-hist-29', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', '2026-07-20T04:30:00.000Z', '2026-07-20T05:40:00.000Z', 4200, 0, 'completed', '2026-07-20T04:30:00.000Z', '2026-07-20T05:40:00.000Z'),
('sess-hist-30', 'acc-student-demo-001', 'subj-math', 'chap-math-2', '2026-07-19T04:30:00.000Z', '2026-07-19T05:00:00.000Z', 1800, 0, 'completed', '2026-07-19T04:30:00.000Z', '2026-07-19T05:00:00.000Z');

-- 5. Create Recent & Historical Planner Tasks
INSERT INTO planner_tasks (id, account_id, subject_id, chapter_id, title, planned_date, planned_start_time, estimated_duration_minutes, priority, status, notes, created_at, updated_at, completed_at) VALUES
('task-today-1', 'acc-student-demo-001', 'subj-math', 'chap-math-3', 'Complete Integration Exercises', '2026-08-18', '09:00', 45, 'high', 'completed', 'Focus on integration by parts problems', '2026-08-18T02:30:00.000Z', '2026-08-18T04:15:00.000Z', '2026-08-18T04:15:00.000Z'),
('task-today-2', 'acc-student-demo-001', 'subj-chem', 'chap-chem-3', 'Revise Organic Chemistry Notes', '2026-08-18', '11:00', 40, 'high', 'in_progress', 'Reaction mechanisms and functional groups', '2026-08-18T02:30:00.000Z', '2026-08-18T05:30:00.000Z', NULL),
('task-today-3', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', 'Complete DSA Arrays Sheet', '2026-08-18', '14:30', 60, 'medium', 'planned', 'Two pointer & sliding window technique', '2026-08-18T02:30:00.000Z', '2026-08-18T02:30:00.000Z', NULL),
('task-today-4', 'acc-student-demo-001', 'subj-eng', 'chap-eng-2', 'Read English Chapter 4', '2026-08-18', '16:30', 30, 'low', 'planned', 'Annotate main passage arguments', '2026-08-18T02:30:00.000Z', '2026-08-18T02:30:00.000Z', NULL),
('task-tom-1', 'acc-student-demo-001', 'subj-phys', 'chap-phys-2', 'Solve Physics Numericals', '2026-08-19', '10:00', 60, 'high', 'planned', 'Work done by variable force formulas', '2026-08-18T02:30:00.000Z', '2026-08-18T02:30:00.000Z', NULL),
('task-tom-2', 'acc-student-demo-001', 'subj-cs', 'chap-cs-2', 'Implement Linked List Reversal', '2026-08-19', '14:00', 45, 'medium', 'planned', 'Iterative and recursive approaches', '2026-08-18T02:30:00.000Z', '2026-08-18T02:30:00.000Z', NULL),
('task-tom-3', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'Grammar Worksheet Practice', '2026-08-19', '16:00', 30, 'low', 'planned', 'Subject-verb agreement drills', '2026-08-18T02:30:00.000Z', '2026-08-18T02:30:00.000Z', NULL),
('task-2d-1', 'acc-student-demo-001', 'subj-math', 'chap-math-2', 'Prepare Weekly Revision', '2026-08-20', '09:30', 90, 'high', 'planned', 'Consolidate differentiation formulas', '2026-08-18T02:30:00.000Z', '2026-08-18T02:30:00.000Z', NULL),
('task-2d-2', 'acc-student-demo-001', 'subj-phys', 'chap-phys-3', 'Gravitation Formulas Review', '2026-08-20', '11:30', 45, 'medium', 'planned', 'Kepler laws and gravitational potential', '2026-08-18T02:30:00.000Z', '2026-08-18T02:30:00.000Z', NULL),
('task-3d-1', 'acc-student-demo-001', 'subj-cs', 'chap-cs-3', 'Binary Tree Traversal Problems', '2026-08-21', '10:00', 60, 'medium', 'planned', 'Inorder, Preorder, Postorder traversals', '2026-08-18T02:30:00.000Z', '2026-08-18T02:30:00.000Z', NULL),
('task-yest-1', 'acc-student-demo-001', 'subj-chem', 'chap-chem-2', 'Chemical Bonding Quiz Prep', '2026-08-17', '18:00', 45, 'medium', 'deferred', 'VSEPR theory and hybridization', '2026-08-16T02:30:00.000Z', '2026-08-17T14:30:00.000Z', NULL),
('task-hist-4', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'English Essay Writing #4', '2026-08-14', '09:00', 70, 'medium', 'completed', 'Historical completed task', '2026-08-14T02:30:00.000Z', '2026-08-14T05:30:00.000Z', '2026-08-14T05:30:00.000Z'),
('task-hist-5', 'acc-student-demo-001', 'subj-math', 'chap-math-2', 'Math Problem Solving #5', '2026-08-13', '09:00', 30, 'medium', 'completed', 'Historical completed task', '2026-08-13T02:30:00.000Z', '2026-08-13T05:30:00.000Z', '2026-08-13T05:30:00.000Z'),
('task-hist-6', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', 'Physics Formula Revision #6', '2026-08-12', '09:00', 40, 'medium', 'completed', 'Historical completed task', '2026-08-12T02:30:00.000Z', '2026-08-12T05:30:00.000Z', '2026-08-12T05:30:00.000Z'),
('task-hist-7', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', 'Chemistry Lab Notes #7', '2026-08-11', '09:00', 50, 'medium', 'completed', 'Historical completed task', '2026-08-11T02:30:00.000Z', '2026-08-11T05:30:00.000Z', '2026-08-11T05:30:00.000Z'),
('task-hist-8', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', 'DSA Practice #8', '2026-08-10', '09:00', 60, 'medium', 'completed', 'Historical completed task', '2026-08-10T02:30:00.000Z', '2026-08-10T05:30:00.000Z', '2026-08-10T05:30:00.000Z'),
('task-hist-9', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'English Essay Writing #9', '2026-08-09', '09:00', 70, 'medium', 'completed', 'Historical completed task', '2026-08-09T02:30:00.000Z', '2026-08-09T05:30:00.000Z', '2026-08-09T05:30:00.000Z'),
('task-hist-10', 'acc-student-demo-001', 'subj-math', 'chap-math-2', 'Math Problem Solving #10', '2026-08-08', '09:00', 30, 'medium', 'completed', 'Historical completed task', '2026-08-08T02:30:00.000Z', '2026-08-08T05:30:00.000Z', '2026-08-08T05:30:00.000Z'),
('task-hist-11', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', 'Physics Formula Revision #11', '2026-08-07', '09:00', 40, 'medium', 'completed', 'Historical completed task', '2026-08-07T02:30:00.000Z', '2026-08-07T05:30:00.000Z', '2026-08-07T05:30:00.000Z'),
('task-hist-12', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', 'Chemistry Lab Notes #12', '2026-08-06', '09:00', 50, 'medium', 'completed', 'Historical completed task', '2026-08-06T02:30:00.000Z', '2026-08-06T05:30:00.000Z', '2026-08-06T05:30:00.000Z'),
('task-hist-13', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', 'DSA Practice #13', '2026-08-05', '09:00', 60, 'medium', 'completed', 'Historical completed task', '2026-08-05T02:30:00.000Z', '2026-08-05T05:30:00.000Z', '2026-08-05T05:30:00.000Z'),
('task-hist-14', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'English Essay Writing #14', '2026-08-04', '09:00', 70, 'medium', 'completed', 'Historical completed task', '2026-08-04T02:30:00.000Z', '2026-08-04T05:30:00.000Z', '2026-08-04T05:30:00.000Z'),
('task-hist-15', 'acc-student-demo-001', 'subj-math', 'chap-math-2', 'Math Problem Solving #15', '2026-08-03', '09:00', 30, 'medium', 'completed', 'Historical completed task', '2026-08-03T02:30:00.000Z', '2026-08-03T05:30:00.000Z', '2026-08-03T05:30:00.000Z'),
('task-hist-16', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', 'Physics Formula Revision #16', '2026-08-02', '09:00', 40, 'medium', 'completed', 'Historical completed task', '2026-08-02T02:30:00.000Z', '2026-08-02T05:30:00.000Z', '2026-08-02T05:30:00.000Z'),
('task-hist-17', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', 'Chemistry Lab Notes #17', '2026-08-01', '09:00', 50, 'medium', 'completed', 'Historical completed task', '2026-08-01T02:30:00.000Z', '2026-08-01T05:30:00.000Z', '2026-08-01T05:30:00.000Z'),
('task-hist-18', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', 'DSA Practice #18', '2026-07-31', '09:00', 60, 'medium', 'completed', 'Historical completed task', '2026-07-31T02:30:00.000Z', '2026-07-31T05:30:00.000Z', '2026-07-31T05:30:00.000Z'),
('task-hist-19', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'English Essay Writing #19', '2026-07-30', '09:00', 70, 'medium', 'completed', 'Historical completed task', '2026-07-30T02:30:00.000Z', '2026-07-30T05:30:00.000Z', '2026-07-30T05:30:00.000Z'),
('task-hist-20', 'acc-student-demo-001', 'subj-math', 'chap-math-2', 'Math Problem Solving #20', '2026-07-29', '09:00', 30, 'medium', 'completed', 'Historical completed task', '2026-07-29T02:30:00.000Z', '2026-07-29T05:30:00.000Z', '2026-07-29T05:30:00.000Z'),
('task-hist-21', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', 'Physics Formula Revision #21', '2026-07-28', '09:00', 40, 'medium', 'completed', 'Historical completed task', '2026-07-28T02:30:00.000Z', '2026-07-28T05:30:00.000Z', '2026-07-28T05:30:00.000Z'),
('task-hist-22', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', 'Chemistry Lab Notes #22', '2026-07-27', '09:00', 50, 'medium', 'completed', 'Historical completed task', '2026-07-27T02:30:00.000Z', '2026-07-27T05:30:00.000Z', '2026-07-27T05:30:00.000Z'),
('task-hist-23', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', 'DSA Practice #23', '2026-07-26', '09:00', 60, 'medium', 'completed', 'Historical completed task', '2026-07-26T02:30:00.000Z', '2026-07-26T05:30:00.000Z', '2026-07-26T05:30:00.000Z'),
('task-hist-24', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'English Essay Writing #24', '2026-07-25', '09:00', 70, 'medium', 'completed', 'Historical completed task', '2026-07-25T02:30:00.000Z', '2026-07-25T05:30:00.000Z', '2026-07-25T05:30:00.000Z'),
('task-hist-25', 'acc-student-demo-001', 'subj-math', 'chap-math-2', 'Math Problem Solving #25', '2026-07-24', '09:00', 30, 'medium', 'completed', 'Historical completed task', '2026-07-24T02:30:00.000Z', '2026-07-24T05:30:00.000Z', '2026-07-24T05:30:00.000Z'),
('task-hist-26', 'acc-student-demo-001', 'subj-phys', 'chap-phys-1', 'Physics Formula Revision #26', '2026-07-23', '09:00', 40, 'medium', 'completed', 'Historical completed task', '2026-07-23T02:30:00.000Z', '2026-07-23T05:30:00.000Z', '2026-07-23T05:30:00.000Z'),
('task-hist-27', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', 'Chemistry Lab Notes #27', '2026-07-22', '09:00', 50, 'medium', 'completed', 'Historical completed task', '2026-07-22T02:30:00.000Z', '2026-07-22T05:30:00.000Z', '2026-07-22T05:30:00.000Z'),
('task-hist-28', 'acc-student-demo-001', 'subj-cs', 'chap-cs-1', 'DSA Practice #28', '2026-07-21', '09:00', 60, 'medium', 'completed', 'Historical completed task', '2026-07-21T02:30:00.000Z', '2026-07-21T05:30:00.000Z', '2026-07-21T05:30:00.000Z'),
('task-hist-29', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'English Essay Writing #29', '2026-07-20', '09:00', 70, 'medium', 'completed', 'Historical completed task', '2026-07-20T02:30:00.000Z', '2026-07-20T05:30:00.000Z', '2026-07-20T05:30:00.000Z'),
('task-hist-30', 'acc-student-demo-001', 'subj-math', 'chap-math-2', 'Math Problem Solving #30', '2026-07-19', '09:00', 30, 'medium', 'completed', 'Historical completed task', '2026-07-19T02:30:00.000Z', '2026-07-19T05:30:00.000Z', '2026-07-19T05:30:00.000Z');

-- 6. Create Revision Items & Sessions
INSERT INTO revision_items (
  id, account_id, subject_id, chapter_id, originating_study_session_id, scheduled_date,
  revision_stage, status, priority, notes, total_revision_count, retention_score,
  created_at, updated_at, last_revision_at, completed_at
) VALUES
('rev-today-1', 'acc-student-demo-001', 'subj-math', 'chap-math-3', 'sess-yest-1', '2026-08-18', 2, 'due_today', 'high', 'Integration by parts and trigonometric substitution', 1, 95, '2026-08-17T04:30:00.000Z', '2026-08-18T04:30:00.000Z', '2026-08-17T09:30:00.000Z', NULL),
('rev-today-2', 'acc-student-demo-001', 'subj-phys', 'chap-phys-2', 'sess-yest-2', '2026-08-18', 1, 'due_today', 'medium', 'Work-energy theorem & conservation laws', 0, 90, '2026-08-17T04:30:00.000Z', '2026-08-18T04:30:00.000Z', NULL, NULL),
('rev-overdue-1', 'acc-student-demo-001', 'subj-chem', 'chap-chem-1', 'sess-3d-1', '2026-08-17', 1, 'overdue', 'high', 'Bohr model & electron configuration', 0, 80, '2026-08-15T04:30:00.000Z', '2026-08-17T04:30:00.000Z', NULL, NULL),
('rev-up-1', 'acc-student-demo-001', 'subj-cs', 'chap-cs-2', 'sess-2d-1', '2026-08-19', 1, 'scheduled', 'medium', 'Linked list cycle detection', 0, 100, '2026-08-16T04:30:00.000Z', '2026-08-18T04:30:00.000Z', NULL, NULL),
('rev-comp-1', 'acc-student-demo-001', 'subj-eng', 'chap-eng-1', 'sess-3d-2', '2026-08-17', 4, 'completed', 'low', 'Active vs passive voice drills', 3, 100, '2026-08-13T04:30:00.000Z', '2026-08-17T04:30:00.000Z', '2026-08-17T10:30:00.000Z', '2026-08-17T10:30:00.000Z');

INSERT INTO revision_sessions (
  id, account_id, revision_item_id, subject_id, chapter_id, start_time, end_time,
  duration_seconds, pause_duration_seconds, revision_stage, status, notes, created_at, updated_at
) VALUES
('rev-sess-1', 'acc-student-demo-001', 'rev-today-1', 'subj-math', 'chap-math-3', '2026-08-17T09:30:00.000Z', '2026-08-17T09:50:00.000Z', 1200, 0, 1, 'completed', 'First recall review done', '2026-08-17T09:30:00.000Z', '2026-08-17T09:50:00.000Z'),
('rev-sess-2', 'acc-student-demo-001', 'rev-comp-1', 'subj-eng', 'chap-eng-1', '2026-08-17T10:30:00.000Z', '2026-08-17T10:45:00.000Z', 900, 0, 3, 'completed', 'Final revision completed', '2026-08-17T10:30:00.000Z', '2026-08-17T10:45:00.000Z'),
('rev-sess-hist-4', 'acc-student-demo-001', 'rev-today-1', 'subj-eng', 'chap-eng-1', '2026-08-14T09:30:00.000Z', '2026-08-14T09:55:00.000Z', 1500, 0, 1, 'completed', 'Routine historical revision', '2026-08-14T09:30:00.000Z', '2026-08-14T09:55:00.000Z'),
('rev-sess-hist-6', 'acc-student-demo-001', 'rev-today-1', 'subj-phys', 'chap-phys-1', '2026-08-12T09:30:00.000Z', '2026-08-12T09:50:00.000Z', 1200, 0, 1, 'completed', 'Routine historical revision', '2026-08-12T09:30:00.000Z', '2026-08-12T09:50:00.000Z'),
('rev-sess-hist-8', 'acc-student-demo-001', 'rev-today-1', 'subj-cs', 'chap-cs-1', '2026-08-10T09:30:00.000Z', '2026-08-10T10:00:00.000Z', 1800, 0, 1, 'completed', 'Routine historical revision', '2026-08-10T09:30:00.000Z', '2026-08-10T10:00:00.000Z'),
('rev-sess-hist-10', 'acc-student-demo-001', 'rev-today-1', 'subj-math', 'chap-math-2', '2026-08-08T09:30:00.000Z', '2026-08-08T09:55:00.000Z', 1500, 0, 1, 'completed', 'Routine historical revision', '2026-08-08T09:30:00.000Z', '2026-08-08T09:55:00.000Z'),
('rev-sess-hist-12', 'acc-student-demo-001', 'rev-today-1', 'subj-chem', 'chap-chem-1', '2026-08-06T09:30:00.000Z', '2026-08-06T09:50:00.000Z', 1200, 0, 1, 'completed', 'Routine historical revision', '2026-08-06T09:30:00.000Z', '2026-08-06T09:50:00.000Z'),
('rev-sess-hist-14', 'acc-student-demo-001', 'rev-today-1', 'subj-eng', 'chap-eng-1', '2026-08-04T09:30:00.000Z', '2026-08-04T10:00:00.000Z', 1800, 0, 1, 'completed', 'Routine historical revision', '2026-08-04T09:30:00.000Z', '2026-08-04T10:00:00.000Z'),
('rev-sess-hist-16', 'acc-student-demo-001', 'rev-today-1', 'subj-phys', 'chap-phys-1', '2026-08-02T09:30:00.000Z', '2026-08-02T09:55:00.000Z', 1500, 0, 1, 'completed', 'Routine historical revision', '2026-08-02T09:30:00.000Z', '2026-08-02T09:55:00.000Z'),
('rev-sess-hist-18', 'acc-student-demo-001', 'rev-today-1', 'subj-cs', 'chap-cs-1', '2026-07-31T09:30:00.000Z', '2026-07-31T09:50:00.000Z', 1200, 0, 1, 'completed', 'Routine historical revision', '2026-07-31T09:30:00.000Z', '2026-07-31T09:50:00.000Z'),
('rev-sess-hist-20', 'acc-student-demo-001', 'rev-today-1', 'subj-math', 'chap-math-2', '2026-07-29T09:30:00.000Z', '2026-07-29T10:00:00.000Z', 1800, 0, 1, 'completed', 'Routine historical revision', '2026-07-29T09:30:00.000Z', '2026-07-29T10:00:00.000Z'),
('rev-sess-hist-22', 'acc-student-demo-001', 'rev-today-1', 'subj-chem', 'chap-chem-1', '2026-07-27T09:30:00.000Z', '2026-07-27T09:55:00.000Z', 1500, 0, 1, 'completed', 'Routine historical revision', '2026-07-27T09:30:00.000Z', '2026-07-27T09:55:00.000Z'),
('rev-sess-hist-24', 'acc-student-demo-001', 'rev-today-1', 'subj-eng', 'chap-eng-1', '2026-07-25T09:30:00.000Z', '2026-07-25T09:50:00.000Z', 1200, 0, 1, 'completed', 'Routine historical revision', '2026-07-25T09:30:00.000Z', '2026-07-25T09:50:00.000Z'),
('rev-sess-hist-26', 'acc-student-demo-001', 'rev-today-1', 'subj-phys', 'chap-phys-1', '2026-07-23T09:30:00.000Z', '2026-07-23T10:00:00.000Z', 1800, 0, 1, 'completed', 'Routine historical revision', '2026-07-23T09:30:00.000Z', '2026-07-23T10:00:00.000Z'),
('rev-sess-hist-28', 'acc-student-demo-001', 'rev-today-1', 'subj-cs', 'chap-cs-1', '2026-07-21T09:30:00.000Z', '2026-07-21T09:55:00.000Z', 1500, 0, 1, 'completed', 'Routine historical revision', '2026-07-21T09:30:00.000Z', '2026-07-21T09:55:00.000Z'),
('rev-sess-hist-30', 'acc-student-demo-001', 'rev-today-1', 'subj-math', 'chap-math-2', '2026-07-19T09:30:00.000Z', '2026-07-19T09:50:00.000Z', 1200, 0, 1, 'completed', 'Routine historical revision', '2026-07-19T09:30:00.000Z', '2026-07-19T09:50:00.000Z');

-- 7. Create Active Exam Goal
INSERT INTO exam_goals (
  id, account_id, exam_name, exam_date, target_score, target_daily_minutes,
  target_total_chapters, completed_chapters, status, created_at, updated_at
) VALUES
('goal-dev-001', 'acc-student-demo-001', 'JEE Main 2027', '2027-01-15', '99.5 Percentile', 180, 50, 18, 'active', '2026-08-08T04:30:00.000Z', '2026-08-18T04:30:00.000Z');
