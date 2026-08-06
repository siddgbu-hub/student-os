import { Hono, Context } from 'hono';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { PlannerRepository } from '../../db/planner.repository.js';
import { StudyRepository } from '../../db/study.repository.js';
import { PlannerService } from './planner.service.js';
import {
  CreatePlannerTaskSchema,
  UpdatePlannerTaskSchema,
  ReschedulePlannerTaskSchema,
} from '@student-os/shared';
import type { Env } from '../../index.js';

export const plannerRouter = new Hono<{ Bindings: Env; Variables: { accountId: string; sessionId: string; deviceId: string } }>();

// Protect all Planner routes with Auth Middleware
plannerRouter.use('*', createAuthMiddleware);

type PlannerContext = Context<{ Bindings: Env; Variables: { accountId: string; sessionId: string; deviceId: string } }>;

// Helper to initialize service
function getPlannerService(c: PlannerContext): PlannerService {
  const repo = new PlannerRepository(c.env.DB);
  const studyRepo = new StudyRepository(c.env.DB);
  return new PlannerService(repo, studyRepo);
}

// 1. Create Task / Study Block
plannerRouter.post('/tasks', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json().catch(() => ({}));

  const parseResult = CreatePlannerTaskSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task input',
          details: parseResult.error.errors,
        },
      },
      400
    );
  }

  try {
    const service = getPlannerService(c);
    const task = await service.createTask(accountId, parseResult.data);
    return c.json({ success: true, data: task }, 201);
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg === 'SUBJECT_NOT_FOUND') {
      return c.json({ success: false, error: { code: 'SUBJECT_NOT_FOUND', message: 'Subject not found' } }, 404);
    }
    if (msg === 'CHAPTER_NOT_FOUND') {
      return c.json({ success: false, error: { code: 'CHAPTER_NOT_FOUND', message: 'Chapter not found' } }, 404);
    }
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
});

// 2. Get Today's Daily Plan Summary
plannerRouter.get('/tasks/today', async (c) => {
  const accountId = c.get('accountId');
  const dateStr = c.req.query('date');
  try {
    const service = getPlannerService(c);
    const summary = await service.getDailyPlan(accountId, dateStr);
    return c.json({ success: true, data: summary });
  } catch (err: unknown) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } }, 500);
  }
});

// 3. Get Weekly Overview Summary
plannerRouter.get('/tasks/weekly', async (c) => {
  const accountId = c.get('accountId');
  const startDateStr = c.req.query('startDate');
  try {
    const service = getPlannerService(c);
    const summary = await service.getWeeklyPlan(accountId, startDateStr);
    return c.json({ success: true, data: summary });
  } catch (err: unknown) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } }, 500);
  }
});

// 4. Get Tasks (by date range or single date)
plannerRouter.get('/tasks', async (c) => {
  const accountId = c.get('accountId');
  const date = c.req.query('date');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  try {
    const service = getPlannerService(c);
    if (startDate && endDate) {
      const summary = await service.getWeeklyPlan(accountId, startDate);
      return c.json({ success: true, data: summary });
    }
    const summary = await service.getDailyPlan(accountId, date);
    return c.json({ success: true, data: summary.tasks });
  } catch (err: unknown) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } }, 500);
  }
});

// GET /api/v1/planner/monthly?year=2026&month=8
plannerRouter.get('/monthly', async (c) => {
  const accountId = c.get('accountId');
  const now = new Date();
  const year = Number(c.req.query('year')) || now.getFullYear();
  const month = Number(c.req.query('month')) || now.getMonth() + 1;

  try {
    const service = getPlannerService(c);
    const summary = await service.getMonthlySummary(accountId, year, month, c.env.DB);
    return c.json({ success: true, data: summary });
  } catch (err: unknown) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } }, 500);
  }
});

// 5. Get Task Details by ID
plannerRouter.get('/tasks/:id', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  try {
    const service = getPlannerService(c);
    const task = await service.getTaskById(accountId, id);
    return c.json({ success: true, data: task });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg === 'TASK_NOT_FOUND') {
      return c.json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } }, 404);
    }
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
});

// 6. Update Task Details
plannerRouter.put('/tasks/:id', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const parseResult = UpdatePlannerTaskSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task update input',
          details: parseResult.error.errors,
        },
      },
      400
    );
  }

  try {
    const service = getPlannerService(c);
    const task = await service.updateTask(accountId, id, parseResult.data);
    return c.json({ success: true, data: task });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg === 'TASK_NOT_FOUND') {
      return c.json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } }, 404);
    }
    if (msg === 'PLANNER_CANNOT_EDIT_COMPLETED_TASK') {
      return c.json(
        { success: false, error: { code: 'PLANNER_CANNOT_EDIT_COMPLETED_TASK', message: 'Completed tasks cannot be edited' } },
        400
      );
    }
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
});

// 7. Update Task Status
plannerRouter.patch('/tasks/:id/status', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  if (!body.status) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Status is required' } }, 400);
  }

  try {
    const service = getPlannerService(c);
    const task = await service.updateTaskStatus(accountId, id, body.status);
    return c.json({ success: true, data: task });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg === 'TASK_NOT_FOUND') {
      return c.json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } }, 404);
    }
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
});

// 8. Reschedule / Carry Forward Task
plannerRouter.post('/tasks/:id/reschedule', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const parseResult = ReschedulePlannerTaskSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid reschedule input',
          details: parseResult.error.errors,
        },
      },
      400
    );
  }

  try {
    const service = getPlannerService(c);
    const task = await service.rescheduleTask(accountId, id, parseResult.data);
    return c.json({ success: true, data: task });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg === 'TASK_NOT_FOUND') {
      return c.json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } }, 404);
    }
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
});

// 9. Delete Task
plannerRouter.delete('/tasks/:id', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  try {
    const service = getPlannerService(c);
    await service.deleteTask(accountId, id);
    return c.json({ success: true, message: 'Task deleted successfully' });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg === 'TASK_NOT_FOUND') {
      return c.json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } }, 404);
    }
    if (msg === 'PLANNER_CANNOT_DELETE_IN_PROGRESS_TASK') {
      return c.json(
        { success: false, error: { code: 'PLANNER_CANNOT_DELETE_IN_PROGRESS_TASK', message: 'In progress tasks cannot be deleted' } },
        400
      );
    }
    if (msg === 'PLANNER_CANNOT_DELETE_COMPLETED_TASK') {
      return c.json(
        { success: false, error: { code: 'PLANNER_CANNOT_DELETE_COMPLETED_TASK', message: 'Completed tasks cannot be deleted' } },
        400
      );
    }
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
});
