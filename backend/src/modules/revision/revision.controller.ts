import { Hono, Context } from 'hono';
import type { Env } from '../../index.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { RevisionRepository } from '../../db/revision.repository.js';
import { StudyRepository } from '../../db/study.repository.js';
import { RevisionService } from './revision.service.js';
import {
  CreateRevisionItemSchema,
  UpdateRevisionItemSchema,
  RescheduleRevisionItemSchema,
  StartRevisionSessionSchema,
} from '@student-os/shared';

export const revisionRouter = new Hono<{
  Bindings: Env;
  Variables: {
    accountId: string;
    sessionId: string;
    deviceId: string;
  };
}>();

revisionRouter.use('*', createAuthMiddleware);

type RevisionContext = Context<{
  Bindings: Env;
  Variables: { accountId: string; sessionId: string; deviceId: string };
}>;

function getRevisionService(c: RevisionContext): RevisionService {
  const repo = new RevisionRepository(c.env.DB);
  const studyRepo = new StudyRepository(c.env.DB);
  return new RevisionService(repo, studyRepo);
}

// 1. Get Revision Items Workspace
revisionRouter.get('/items', async (c) => {
  const accountId = c.get('accountId');
  const dateStr = c.req.query('date');
  const service = getRevisionService(c);

  const items = await service.getRevisionItems(accountId, dateStr);
  return c.json({ success: true, data: items }, 200);
});

// 2. Get Daily Revision Summary
revisionRouter.get('/summary', async (c) => {
  const accountId = c.get('accountId');
  const dateStr = c.req.query('date');
  const service = getRevisionService(c);

  const summary = await service.getDailySummary(accountId, dateStr);
  return c.json({ success: true, data: summary }, 200);
});

// 3. Create Manual Revision Item
revisionRouter.post('/items', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json();
  const parseRes = CreateRevisionItemSchema.safeParse(body);

  if (!parseRes.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parseRes.error.flatten() }, 400);
  }

  const service = getRevisionService(c);
  try {
    const item = await service.createManualRevisionItem(accountId, parseRes.data);
    return c.json({ success: true, data: item }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CREATE_REVISION_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 4. Update Revision Item Details
revisionRouter.put('/items/:id', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parseRes = UpdateRevisionItemSchema.safeParse(body);

  if (!parseRes.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parseRes.error.flatten() }, 400);
  }

  const service = getRevisionService(c);
  try {
    const item = await service.updateRevisionItem(accountId, id, parseRes.data);
    return c.json({ success: true, data: item }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UPDATE_REVISION_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 5. Reschedule Revision Item
revisionRouter.post('/items/:id/reschedule', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parseRes = RescheduleRevisionItemSchema.safeParse(body);

  if (!parseRes.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parseRes.error.flatten() }, 400);
  }

  const service = getRevisionService(c);
  try {
    const item = await service.rescheduleRevisionItem(accountId, id, parseRes.data);
    return c.json({ success: true, data: item }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'RESCHEDULE_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 6. Archive Revision Item
revisionRouter.post('/items/:id/archive', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const service = getRevisionService(c);

  try {
    const item = await service.archiveRevisionItem(accountId, id);
    return c.json({ success: true, data: item }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ARCHIVE_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 7. Start Revision Session
revisionRouter.post('/sessions/start', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json();
  const parseRes = StartRevisionSessionSchema.safeParse(body);

  if (!parseRes.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parseRes.error.flatten() }, 400);
  }

  const service = getRevisionService(c);
  try {
    const session = await service.startRevisionSession(accountId, parseRes.data);
    return c.json({ success: true, data: session }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'START_REVISION_SESSION_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 8. Get Active Revision Session
revisionRouter.get('/sessions/active', async (c) => {
  const accountId = c.get('accountId');
  const service = getRevisionService(c);

  const session = await service.getActiveRevisionSession(accountId);
  return c.json({ success: true, data: session }, 200);
});

// 9. Pause Revision Session
revisionRouter.post('/sessions/:id/pause', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const service = getRevisionService(c);

  try {
    const session = await service.pauseRevisionSession(accountId, id);
    return c.json({ success: true, data: session }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PAUSE_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 10. Resume Revision Session
revisionRouter.post('/sessions/:id/resume', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const service = getRevisionService(c);

  try {
    const session = await service.resumeRevisionSession(accountId, id);
    return c.json({ success: true, data: session }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'RESUME_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 11. End / Complete Revision Session
revisionRouter.post('/sessions/:id/end', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const service = getRevisionService(c);

  try {
    const result = await service.endRevisionSession(accountId, id, body.notes);
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'END_SESSION_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 12. Cancel Revision Session
revisionRouter.post('/sessions/:id/cancel', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const service = getRevisionService(c);

  try {
    const session = await service.cancelRevisionSession(accountId, id);
    return c.json({ success: true, data: session }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CANCEL_SESSION_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});
