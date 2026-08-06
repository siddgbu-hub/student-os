import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRelativeDateStr(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

function getRelativeIsoStr(dayOffset: number, hour: number = 10, minute: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function generateDevSeedSql(): string {
  const accountId = 'acc-student-demo-001';
  const email = 'student@example.com';
  const deviceId = 'dev-student-demo-001';

  const todayStr = getRelativeDateStr(0);
  const yesterdayStr = getRelativeDateStr(-1);
  const tomorrowStr = getRelativeDateStr(1);
  const inTwoDaysStr = getRelativeDateStr(2);
  const inThreeDaysStr = getRelativeDateStr(3);

  // Generate 30-day historical sessions
  const historicalStudySessions: string[] = [];
  const historicalRevisionSessions: string[] = [];
  const historicalPlannerTasks: string[] = [];

  const subjects = [
    { id: 'subj-math', chap: 'chap-math-2', title: 'Math Problem Solving' },
    { id: 'subj-phys', chap: 'chap-phys-1', title: 'Physics Formula Revision' },
    { id: 'subj-chem', chap: 'chap-chem-1', title: 'Chemistry Lab Notes' },
    { id: 'subj-cs', chap: 'chap-cs-1', title: 'DSA Practice' },
    { id: 'subj-eng', chap: 'chap-eng-1', title: 'English Essay Writing' },
  ];

  for (let i = 4; i <= 30; i++) {
    const dayOffset = -i;
    const dateStr = getRelativeDateStr(dayOffset);
    const sub = subjects[i % subjects.length];
    const duration = 1800 + (i % 5) * 600; // 30-70 mins

    historicalStudySessions.push(
      `('sess-hist-${i}', '${accountId}', '${sub.id}', '${sub.chap}', '${getRelativeIsoStr(dayOffset, 10, 0)}', '${getRelativeIsoStr(dayOffset, 10, Math.floor(duration / 60))}', ${duration}, 0, 'completed', '${getRelativeIsoStr(dayOffset, 10, 0)}', '${getRelativeIsoStr(dayOffset, 10, Math.floor(duration / 60))}')`
    );

    if (i % 2 === 0) {
      const revDuration = 1200 + (i % 3) * 300;
      historicalRevisionSessions.push(
        `('rev-sess-hist-${i}', '${accountId}', 'rev-today-1', '${sub.id}', '${sub.chap}', '${getRelativeIsoStr(dayOffset, 15, 0)}', '${getRelativeIsoStr(dayOffset, 15, Math.floor(revDuration / 60))}', ${revDuration}, 0, 1, 'completed', 'Routine historical revision', '${getRelativeIsoStr(dayOffset, 15, 0)}', '${getRelativeIsoStr(dayOffset, 15, Math.floor(revDuration / 60))}')`
      );
    }

    historicalPlannerTasks.push(
      `('task-hist-${i}', '${accountId}', '${sub.id}', '${sub.chap}', '${sub.title} #${i}', '${dateStr}', '09:00', ${Math.floor(duration / 60)}, 'medium', 'completed', 'Historical completed task', '${getRelativeIsoStr(dayOffset, 8)}', '${getRelativeIsoStr(dayOffset, 11)}', '${getRelativeIsoStr(dayOffset, 11)}')`
    );
  }

  const sql = `
-- Student OS Development Seed Data
-- Target Account: student@example.com

-- Cleanup previous demo data for student@example.com
DELETE FROM revision_item_logs WHERE account_id = '${accountId}';
DELETE FROM revision_sessions WHERE account_id = '${accountId}';
DELETE FROM revision_items WHERE account_id = '${accountId}';
DELETE FROM planner_task_logs WHERE account_id = '${accountId}';
DELETE FROM planner_tasks WHERE account_id = '${accountId}';
DELETE FROM study_sessions WHERE account_id = '${accountId}';
DELETE FROM chapters WHERE account_id = '${accountId}';
DELETE FROM subjects WHERE account_id = '${accountId}';
DELETE FROM sessions WHERE account_id = '${accountId}';
DELETE FROM devices WHERE account_id = '${accountId}';
DELETE FROM accounts WHERE account_id = '${accountId}' OR email = '${email}';

-- 1. Create Demo Account & Device
INSERT INTO accounts (account_id, email, created_at, last_login_at)
VALUES ('${accountId}', '${email}', '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(0)}');

INSERT INTO devices (device_id, account_id, device_model, os_version, is_active, registered_at, last_active_at)
VALUES ('${deviceId}', '${accountId}', 'MacBook Pro', 'macOS', 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(0)}');

-- 2. Create Subjects
INSERT INTO subjects (id, account_id, name, created_at, updated_at) VALUES
('subj-math', '${accountId}', 'Mathematics', '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('subj-phys', '${accountId}', 'Physics', '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('subj-chem', '${accountId}', 'Chemistry', '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('subj-eng', '${accountId}', 'English', '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('subj-cs', '${accountId}', 'Computer Science', '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}');

-- 3. Create Chapters
INSERT INTO chapters (id, subject_id, account_id, name, order_index, is_completed, created_at, updated_at) VALUES
('chap-math-1', 'subj-math', '${accountId}', 'Limits', 1, 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-math-2', 'subj-math', '${accountId}', 'Differentiation', 2, 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-math-3', 'subj-math', '${accountId}', 'Integration', 3, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-math-4', 'subj-math', '${accountId}', 'Matrices', 4, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-math-5', 'subj-math', '${accountId}', 'Probability', 5, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-phys-1', 'subj-phys', '${accountId}', 'Motion', 1, 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-phys-2', 'subj-phys', '${accountId}', 'Work & Energy', 2, 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-phys-3', 'subj-phys', '${accountId}', 'Gravitation', 3, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-phys-4', 'subj-phys', '${accountId}', 'Current Electricity', 4, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-chem-1', 'subj-chem', '${accountId}', 'Atomic Structure', 1, 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-chem-2', 'subj-chem', '${accountId}', 'Chemical Bonding', 2, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-chem-3', 'subj-chem', '${accountId}', 'Organic Chemistry', 3, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-eng-1', 'subj-eng', '${accountId}', 'Grammar', 1, 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-eng-2', 'subj-eng', '${accountId}', 'Reading Comprehension', 2, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-eng-3', 'subj-eng', '${accountId}', 'Essay Writing', 3, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-cs-1', 'subj-cs', '${accountId}', 'Arrays', 1, 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-cs-2', 'subj-cs', '${accountId}', 'Linked Lists', 2, 1, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-cs-3', 'subj-cs', '${accountId}', 'Trees', 3, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}'),
('chap-cs-4', 'subj-cs', '${accountId}', 'Graphs', 4, 0, '${getRelativeIsoStr(-40)}', '${getRelativeIsoStr(-40)}');

-- 4. Create Recent & Historical Study Sessions
INSERT INTO study_sessions (id, account_id, subject_id, chapter_id, start_time, end_time, duration_seconds, pause_duration_seconds, status, created_at, updated_at) VALUES
('sess-yest-1', '${accountId}', 'subj-math', 'chap-math-3', '${getRelativeIsoStr(-1, 14, 0)}', '${getRelativeIsoStr(-1, 14, 52)}', 3120, 0, 'completed', '${getRelativeIsoStr(-1, 14, 52)}', '${getRelativeIsoStr(-1, 14, 52)}'),
('sess-yest-2', '${accountId}', 'subj-phys', 'chap-phys-2', '${getRelativeIsoStr(-1, 16, 0)}', '${getRelativeIsoStr(-1, 17, 15)}', 4500, 0, 'completed', '${getRelativeIsoStr(-1, 17, 15)}', '${getRelativeIsoStr(-1, 17, 15)}'),
('sess-today-1', '${accountId}', 'subj-chem', 'chap-chem-3', '${getRelativeIsoStr(0, 9, 0)}', '${getRelativeIsoStr(0, 9, 40)}', 2400, 0, 'completed', '${getRelativeIsoStr(0, 9, 40)}', '${getRelativeIsoStr(0, 9, 40)}'),
('sess-today-2', '${accountId}', 'subj-cs', 'chap-cs-3', '${getRelativeIsoStr(0, 11, 0)}', '${getRelativeIsoStr(0, 12, 10)}', 4200, 0, 'completed', '${getRelativeIsoStr(0, 12, 10)}', '${getRelativeIsoStr(0, 12, 10)}'),
('sess-today-3', '${accountId}', 'subj-eng', 'chap-eng-2', '${getRelativeIsoStr(0, 14, 0)}', '${getRelativeIsoStr(0, 14, 25)}', 1500, 0, 'completed', '${getRelativeIsoStr(0, 14, 25)}', '${getRelativeIsoStr(0, 14, 25)}'),
('sess-2d-1', '${accountId}', 'subj-cs', 'chap-cs-1', '${getRelativeIsoStr(-2, 10, 0)}', '${getRelativeIsoStr(-2, 10, 50)}', 3000, 0, 'completed', '${getRelativeIsoStr(-2, 10, 50)}', '${getRelativeIsoStr(-2, 10, 50)}'),
('sess-2d-2', '${accountId}', 'subj-phys', 'chap-phys-1', '${getRelativeIsoStr(-2, 15, 0)}', '${getRelativeIsoStr(-2, 15, 45)}', 2700, 0, 'completed', '${getRelativeIsoStr(-2, 15, 45)}', '${getRelativeIsoStr(-2, 15, 45)}'),
('sess-3d-1', '${accountId}', 'subj-math', 'chap-math-2', '${getRelativeIsoStr(-3, 11, 0)}', '${getRelativeIsoStr(-3, 12, 0)}', 3600, 0, 'completed', '${getRelativeIsoStr(-3, 12, 0)}', '${getRelativeIsoStr(-3, 12, 0)}'),
('sess-3d-2', '${accountId}', 'subj-eng', 'chap-eng-1', '${getRelativeIsoStr(-3, 16, 0)}', '${getRelativeIsoStr(-3, 16, 30)}', 1800, 0, 'completed', '${getRelativeIsoStr(-3, 16, 30)}', '${getRelativeIsoStr(-3, 16, 30)}'),
${historicalStudySessions.join(',\n')};

-- 5. Create Recent & Historical Planner Tasks
INSERT INTO planner_tasks (id, account_id, subject_id, chapter_id, title, planned_date, planned_start_time, estimated_duration_minutes, priority, status, notes, created_at, updated_at, completed_at) VALUES
('task-today-1', '${accountId}', 'subj-math', 'chap-math-3', 'Complete Integration Exercises', '${todayStr}', '09:00', 45, 'high', 'completed', 'Focus on integration by parts problems', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 9, 45)}', '${getRelativeIsoStr(0, 9, 45)}'),
('task-today-2', '${accountId}', 'subj-chem', 'chap-chem-3', 'Revise Organic Chemistry Notes', '${todayStr}', '11:00', 40, 'high', 'in_progress', 'Reaction mechanisms and functional groups', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 11)}', NULL),
('task-today-3', '${accountId}', 'subj-cs', 'chap-cs-1', 'Complete DSA Arrays Sheet', '${todayStr}', '14:30', 60, 'medium', 'planned', 'Two pointer & sliding window technique', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 8)}', NULL),
('task-today-4', '${accountId}', 'subj-eng', 'chap-eng-2', 'Read English Chapter 4', '${todayStr}', '16:30', 30, 'low', 'planned', 'Annotate main passage arguments', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 8)}', NULL),
('task-tom-1', '${accountId}', 'subj-phys', 'chap-phys-2', 'Solve Physics Numericals', '${tomorrowStr}', '10:00', 60, 'high', 'planned', 'Work done by variable force formulas', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 8)}', NULL),
('task-tom-2', '${accountId}', 'subj-cs', 'chap-cs-2', 'Implement Linked List Reversal', '${tomorrowStr}', '14:00', 45, 'medium', 'planned', 'Iterative and recursive approaches', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 8)}', NULL),
('task-tom-3', '${accountId}', 'subj-eng', 'chap-eng-1', 'Grammar Worksheet Practice', '${tomorrowStr}', '16:00', 30, 'low', 'planned', 'Subject-verb agreement drills', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 8)}', NULL),
('task-2d-1', '${accountId}', 'subj-math', 'chap-math-2', 'Prepare Weekly Revision', '${inTwoDaysStr}', '09:30', 90, 'high', 'planned', 'Consolidate differentiation formulas', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 8)}', NULL),
('task-2d-2', '${accountId}', 'subj-phys', 'chap-phys-3', 'Gravitation Formulas Review', '${inTwoDaysStr}', '11:30', 45, 'medium', 'planned', 'Kepler laws and gravitational potential', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 8)}', NULL),
('task-3d-1', '${accountId}', 'subj-cs', 'chap-cs-3', 'Binary Tree Traversal Problems', '${inThreeDaysStr}', '10:00', 60, 'medium', 'planned', 'Inorder, Preorder, Postorder traversals', '${getRelativeIsoStr(0, 8)}', '${getRelativeIsoStr(0, 8)}', NULL),
('task-yest-1', '${accountId}', 'subj-chem', 'chap-chem-2', 'Chemical Bonding Quiz Prep', '${yesterdayStr}', '18:00', 45, 'medium', 'deferred', 'VSEPR theory and hybridization', '${getRelativeIsoStr(-2, 8)}', '${getRelativeIsoStr(-1, 20)}', NULL),
${historicalPlannerTasks.join(',\n')};

-- 6. Create Revision Items & Sessions
INSERT INTO revision_items (
  id, account_id, subject_id, chapter_id, originating_study_session_id, scheduled_date,
  revision_stage, status, priority, notes, total_revision_count, retention_score,
  created_at, updated_at, last_revision_at, completed_at
) VALUES
('rev-today-1', '${accountId}', 'subj-math', 'chap-math-3', 'sess-yest-1', '${todayStr}', 2, 'due_today', 'high', 'Integration by parts and trigonometric substitution', 1, 95, '${getRelativeIsoStr(-1)}', '${getRelativeIsoStr(0)}', '${getRelativeIsoStr(-1, 15)}', NULL),
('rev-today-2', '${accountId}', 'subj-phys', 'chap-phys-2', 'sess-yest-2', '${todayStr}', 1, 'due_today', 'medium', 'Work-energy theorem & conservation laws', 0, 90, '${getRelativeIsoStr(-1)}', '${getRelativeIsoStr(0)}', NULL, NULL),
('rev-overdue-1', '${accountId}', 'subj-chem', 'chap-chem-1', 'sess-3d-1', '${yesterdayStr}', 1, 'overdue', 'high', 'Bohr model & electron configuration', 0, 80, '${getRelativeIsoStr(-3)}', '${getRelativeIsoStr(-1)}', NULL, NULL),
('rev-up-1', '${accountId}', 'subj-cs', 'chap-cs-2', 'sess-2d-1', '${tomorrowStr}', 1, 'scheduled', 'medium', 'Linked list cycle detection', 0, 100, '${getRelativeIsoStr(-2)}', '${getRelativeIsoStr(0)}', NULL, NULL),
('rev-comp-1', '${accountId}', 'subj-eng', 'chap-eng-1', 'sess-3d-2', '${yesterdayStr}', 4, 'completed', 'low', 'Active vs passive voice drills', 3, 100, '${getRelativeIsoStr(-5)}', '${getRelativeIsoStr(-1)}', '${getRelativeIsoStr(-1, 16)}', '${getRelativeIsoStr(-1, 16)}');

INSERT INTO revision_sessions (
  id, account_id, revision_item_id, subject_id, chapter_id, start_time, end_time,
  duration_seconds, pause_duration_seconds, revision_stage, status, notes, created_at, updated_at
) VALUES
('rev-sess-1', '${accountId}', 'rev-today-1', 'subj-math', 'chap-math-3', '${getRelativeIsoStr(-1, 15, 0)}', '${getRelativeIsoStr(-1, 15, 20)}', 1200, 0, 1, 'completed', 'First recall review done', '${getRelativeIsoStr(-1, 15, 0)}', '${getRelativeIsoStr(-1, 15, 20)}'),
('rev-sess-2', '${accountId}', 'rev-comp-1', 'subj-eng', 'chap-eng-1', '${getRelativeIsoStr(-1, 16, 0)}', '${getRelativeIsoStr(-1, 16, 15)}', 900, 0, 3, 'completed', 'Final revision completed', '${getRelativeIsoStr(-1, 16, 0)}', '${getRelativeIsoStr(-1, 16, 15)}'),
${historicalRevisionSessions.join(',\n')};
`;

  return sql;
}

// Generate file when executed
const sql = generateDevSeedSql();
const seedFilePath = path.resolve(__dirname, 'seed_dev.sql');
fs.writeFileSync(seedFilePath, sql, 'utf-8');
console.log(`Generated dev seed SQL script at: ${seedFilePath}`);
