import { Hono } from 'hono';
import { StudyRepository } from '../../db/study.repository.js';
import { StudyService } from './study.service.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { requireActiveSubscription } from '../../middleware/entitlement.js';
import {
  CreateSubjectSchema,
  UpdateSubjectSchema,
  CreateChapterSchema,
  UpdateChapterSchema,
  StartSessionSchema,
} from '@student-os/shared';
import type { Env } from '../../index.js';

export const studyRouter = new Hono<{ Bindings: Env; Variables: { accountId: string; sessionId: string; deviceId: string } }>();

// Protect all Study routes with Auth and Entitlement Middleware
studyRouter.use('*', createAuthMiddleware, requireActiveSubscription());

// --- SUBJECT ENDPOINTS ---

// 1. POST /api/v1/study/subjects
studyRouter.post('/subjects', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json().catch(() => ({}));
  const parse = CreateSubjectSchema.safeParse(body);
  if (!parse.success) {
    return c.json(
      {
        success: false,
        error: { code: 'STUDY_INVALID_INPUT', message: parse.error.issues[0]?.message || 'Invalid subject input' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);
  const subject = await service.createSubject(accountId, parse.data.name);

  return c.json({
    success: true,
    subject,
    timestamp: new Date().toISOString(),
  });
});

// 2. GET /api/v1/study/subjects
studyRouter.get('/subjects', async (c) => {
  const accountId = c.get('accountId');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);
  const subjects = await service.getSubjects(accountId);

  return c.json({
    success: true,
    subjects,
    timestamp: new Date().toISOString(),
  });
});

// 3. PUT /api/v1/study/subjects/:id
studyRouter.put('/subjects/:id', async (c) => {
  const accountId = c.get('accountId');
  const subjectId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parse = UpdateSubjectSchema.safeParse(body);
  if (!parse.success) {
    return c.json(
      {
        success: false,
        error: { code: 'STUDY_INVALID_INPUT', message: parse.error.issues[0]?.message || 'Invalid subject input' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const subject = await service.updateSubject(accountId, subjectId, parse.data.name);
    return c.json({
      success: true,
      subject,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SUBJECT_NOT_FOUND';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Subject not found or access denied' },
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
});

// 4. DELETE /api/v1/study/subjects/:id
studyRouter.delete('/subjects/:id', async (c) => {
  const accountId = c.get('accountId');
  const subjectId = c.req.param('id');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    await service.deleteSubject(accountId, subjectId);
    return c.json({
      success: true,
      message: 'Subject deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SUBJECT_NOT_FOUND';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Subject not found or access denied' },
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
});

// --- CHAPTER ENDPOINTS ---

// 5. POST /api/v1/study/chapters
studyRouter.post('/chapters', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json().catch(() => ({}));
  const parse = CreateChapterSchema.safeParse(body);
  if (!parse.success) {
    return c.json(
      {
        success: false,
        error: { code: 'STUDY_INVALID_INPUT', message: parse.error.issues[0]?.message || 'Invalid chapter input' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const chapter = await service.createChapter(
      accountId,
      parse.data.subjectId,
      parse.data.name,
      parse.data.orderIndex || 0
    );
    return c.json({
      success: true,
      chapter,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SUBJECT_NOT_FOUND';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Subject not found' },
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
});

// 6. GET /api/v1/study/subjects/:subjectId/chapters
studyRouter.get('/subjects/:subjectId/chapters', async (c) => {
  const accountId = c.get('accountId');
  const subjectId = c.req.param('subjectId');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const chapters = await service.getChapters(accountId, subjectId);
    return c.json({
      success: true,
      chapters,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SUBJECT_NOT_FOUND';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Subject not found' },
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
});

// 7. PUT /api/v1/study/chapters/:id
studyRouter.put('/chapters/:id', async (c) => {
  const accountId = c.get('accountId');
  const chapterId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parse = UpdateChapterSchema.safeParse(body);
  if (!parse.success) {
    return c.json(
      {
        success: false,
        error: { code: 'STUDY_INVALID_INPUT', message: parse.error.issues[0]?.message || 'Invalid chapter input' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const chapter = await service.updateChapter(
      accountId,
      chapterId,
      parse.data.name,
      parse.data.orderIndex,
      parse.data.isCompleted
    );
    return c.json({
      success: true,
      chapter,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'CHAPTER_NOT_FOUND';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Chapter not found' },
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
});

// 8. DELETE /api/v1/study/chapters/:id
studyRouter.delete('/chapters/:id', async (c) => {
  const accountId = c.get('accountId');
  const chapterId = c.req.param('id');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    await service.deleteChapter(accountId, chapterId);
    return c.json({
      success: true,
      message: 'Chapter deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'CHAPTER_NOT_FOUND';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Chapter not found' },
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
});

// --- STUDY SESSION ENDPOINTS ---

// 9. POST /api/v1/study/sessions/start
studyRouter.post('/sessions/start', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json().catch(() => ({}));
  const parse = StartSessionSchema.safeParse(body);
  if (!parse.success) {
    return c.json(
      {
        success: false,
        error: { code: 'STUDY_INVALID_INPUT', message: parse.error.issues[0]?.message || 'Invalid session input' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const session = await service.startSession(accountId, parse.data.subjectId, parse.data.chapterId);
    return c.json({
      success: true,
      session,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'STUDY_SESSION_ERROR';
    const status = msg === 'STUDY_ACTIVE_SESSION_EXISTS' ? 409 : 404;
    return c.json(
      {
        success: false,
        error: {
          code: msg,
          message:
            msg === 'STUDY_ACTIVE_SESSION_EXISTS'
              ? 'An active study session is already running. Please end or cancel it first.'
              : 'Subject or Chapter not found',
        },
        timestamp: new Date().toISOString(),
      },
      status
    );
  }
});

// 10. POST /api/v1/study/sessions/:id/pause
studyRouter.post('/sessions/:id/pause', async (c) => {
  const accountId = c.get('accountId');
  const sessionId = c.req.param('id');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const session = await service.pauseSession(accountId, sessionId);
    return c.json({
      success: true,
      session,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SESSION_ERROR';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Failed to pause session' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// 11. POST /api/v1/study/sessions/:id/resume
studyRouter.post('/sessions/:id/resume', async (c) => {
  const accountId = c.get('accountId');
  const sessionId = c.req.param('id');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const session = await service.resumeSession(accountId, sessionId);
    return c.json({
      success: true,
      session,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SESSION_ERROR';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Failed to resume session' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// 12. POST /api/v1/study/sessions/:id/end
studyRouter.post('/sessions/:id/end', async (c) => {
  const accountId = c.get('accountId');
  const sessionId = c.req.param('id');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const session = await service.endSession(accountId, sessionId);
    return c.json({
      success: true,
      session,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SESSION_ERROR';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Failed to end session' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// 13. POST /api/v1/study/sessions/:id/cancel
studyRouter.post('/sessions/:id/cancel', async (c) => {
  const accountId = c.get('accountId');
  const sessionId = c.req.param('id');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  try {
    const session = await service.cancelSession(accountId, sessionId);
    return c.json({
      success: true,
      session,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SESSION_ERROR';
    return c.json(
      {
        success: false,
        error: { code: msg, message: 'Failed to cancel session' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// 14. GET /api/v1/study/sessions/active
studyRouter.get('/sessions/active', async (c) => {
  const accountId = c.get('accountId');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  const session = await service.getActiveSession(accountId);
  return c.json({
    success: true,
    session,
    timestamp: new Date().toISOString(),
  });
});

// 15. GET /api/v1/study/sessions/today
studyRouter.get('/sessions/today', async (c) => {
  const accountId = c.get('accountId');
  const repo = new StudyRepository(c.env.DB);
  const service = new StudyService(repo);

  const summary = await service.getTodaySessions(accountId);
  return c.json({
    success: true,
    summary,
    timestamp: new Date().toISOString(),
  });
});
