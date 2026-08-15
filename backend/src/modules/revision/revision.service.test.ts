import { describe, it, expect } from 'vitest';
import { calculateNextRevisionState, RevisionStateInput } from './revision.service.js';

describe('RevisionScheduler calculateNextRevisionState', () => {
  const timestamp = '2026-08-13T12:00:00.000Z';

  describe('GOOD rating transitions', () => {
    it('stage 1 -> 2 (+3d)', () => {
      const input: RevisionStateInput = { revisionStage: 1, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'good', timestamp);
      expect(res.nextStage).toBe(2);
      expect(res.intervalDays).toBe(3);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(55);
    });

    it('stage 2 -> 3 (+7d)', () => {
      const input: RevisionStateInput = { revisionStage: 2, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'good', timestamp);
      expect(res.nextStage).toBe(3);
      expect(res.intervalDays).toBe(7);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(55);
    });

    it('stage 3 -> 4 (+14d)', () => {
      const input: RevisionStateInput = { revisionStage: 3, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'good', timestamp);
      expect(res.nextStage).toBe(4);
      expect(res.intervalDays).toBe(14);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(55);
    });

    it('stage 4 -> 5 (+30d)', () => {
      const input: RevisionStateInput = { revisionStage: 4, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'good', timestamp);
      expect(res.nextStage).toBe(5);
      expect(res.intervalDays).toBe(30);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(55);
    });

    it('stage 5 -> 5 (+30d, completed)', () => {
      const input: RevisionStateInput = { revisionStage: 5, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'good', timestamp);
      expect(res.nextStage).toBe(5);
      expect(res.intervalDays).toBe(30);
      expect(res.status).toBe('completed');
      expect(res.completedAt).toBe(timestamp);
      expect(res.retentionScore).toBe(55);
    });
  });

  describe('HARD rating transitions', () => {
    it('stage 1 -> +1d', () => {
      const input: RevisionStateInput = { revisionStage: 1, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'hard', timestamp);
      expect(res.nextStage).toBe(1);
      expect(res.intervalDays).toBe(1);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(45);
    });

    it('stage 2 -> +2d', () => {
      const input: RevisionStateInput = { revisionStage: 2, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'hard', timestamp);
      expect(res.nextStage).toBe(2);
      expect(res.intervalDays).toBe(2);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(45);
    });

    it('stage 3 -> +6d', () => {
      const input: RevisionStateInput = { revisionStage: 3, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'hard', timestamp);
      expect(res.nextStage).toBe(3);
      expect(res.intervalDays).toBe(6);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(45);
    });

    it('stage 4 -> +11d', () => {
      const input: RevisionStateInput = { revisionStage: 4, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'hard', timestamp);
      expect(res.nextStage).toBe(4);
      expect(res.intervalDays).toBe(11);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(45);
    });

    it('stage 5 -> +23d', () => {
      const input: RevisionStateInput = { revisionStage: 5, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'hard', timestamp);
      expect(res.nextStage).toBe(5);
      expect(res.intervalDays).toBe(23);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(45);
    });
  });

  describe('EASY rating transitions', () => {
    it('stage 1 -> 3 (+10d)', () => {
      const input: RevisionStateInput = { revisionStage: 1, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'easy', timestamp);
      expect(res.nextStage).toBe(3);
      expect(res.intervalDays).toBe(10);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(100);
    });

    it('stage 2 -> 4 (+21d)', () => {
      const input: RevisionStateInput = { revisionStage: 2, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'easy', timestamp);
      expect(res.nextStage).toBe(4);
      expect(res.intervalDays).toBe(21);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(100);
    });

    it('stage 3 -> 5 (+45d)', () => {
      const input: RevisionStateInput = { revisionStage: 3, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'easy', timestamp);
      expect(res.nextStage).toBe(5);
      expect(res.intervalDays).toBe(45);
      expect(res.status).toBe('scheduled');
      expect(res.retentionScore).toBe(100);
    });

    it('stage 4 -> 5 (+30d, completed)', () => {
      const input: RevisionStateInput = { revisionStage: 4, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'easy', timestamp);
      expect(res.nextStage).toBe(5);
      expect(res.intervalDays).toBe(30);
      expect(res.status).toBe('completed');
      expect(res.completedAt).toBe(timestamp);
      expect(res.retentionScore).toBe(100);
    });

    it('stage 5 -> 5 (+30d, completed)', () => {
      const input: RevisionStateInput = { revisionStage: 5, retentionScore: 50, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'easy', timestamp);
      expect(res.nextStage).toBe(5);
      expect(res.intervalDays).toBe(30);
      expect(res.status).toBe('completed');
      expect(res.completedAt).toBe(timestamp);
      expect(res.retentionScore).toBe(100);
    });
  });

  describe('AGAIN rating transitions', () => {
    it('any stage -> 1 (+1d), lapse_count +1, completed_at cleared, retention -15', () => {
      const input: RevisionStateInput = { revisionStage: 4, retentionScore: 80, lapseCount: 2, completedAt: '2026-08-01T00:00:00.000Z' };
      const res = calculateNextRevisionState(input, 'again', timestamp);
      expect(res.nextStage).toBe(1);
      expect(res.intervalDays).toBe(1);
      expect(res.status).toBe('scheduled');
      expect(res.lapseCount).toBe(3);
      expect(res.completedAt).toBeNull();
      expect(res.retentionScore).toBe(65);
    });
  });

  describe('retention score clamping', () => {
    it('clamps lower bound at 0 on AGAIN', () => {
      const input: RevisionStateInput = { revisionStage: 1, retentionScore: 10, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'again', timestamp);
      expect(res.retentionScore).toBe(0);
    });

    it('clamps lower bound at 0 on HARD', () => {
      const input: RevisionStateInput = { revisionStage: 1, retentionScore: 3, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'hard', timestamp);
      expect(res.retentionScore).toBe(0);
    });

    it('clamps upper bound at 100 on GOOD', () => {
      const input: RevisionStateInput = { revisionStage: 2, retentionScore: 98, lapseCount: 0, completedAt: null };
      const res = calculateNextRevisionState(input, 'good', timestamp);
      expect(res.retentionScore).toBe(100);
    });
  });
});
