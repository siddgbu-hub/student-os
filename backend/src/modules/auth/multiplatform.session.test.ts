import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceService } from './device.service.js';
import { SessionService } from './session.service.js';
import { StudyService } from '../study/study.service.js';
import { StudyRepository, SubjectRecord, ChapterRecord, StudySessionRecord } from '../../db/study.repository.js';
import { AuthRepository, AccountRecord, DeviceRecord, SessionRecord } from '../../db/auth.repository.js';

class InMemoryAuthRepository {
  public accounts: AccountRecord[] = [];
  public devices: DeviceRecord[] = [];
  public sessions: SessionRecord[] = [];
  public auditLogs: Array<{ id: string; accountId: string | null; eventType: string; details: string; createdAt: string }> = [];

  async findDeviceById(deviceId: string): Promise<DeviceRecord | null> {
    return this.devices.find((d) => d.device_id === deviceId) || null;
  }

  async findActiveAndroidDevicesForAccount(accountId: string): Promise<DeviceRecord[]> {
    return this.devices.filter(
      (d) =>
        d.account_id === accountId &&
        d.is_active === 1 &&
        (d.device_id.startsWith('android-') || d.device_id.startsWith('android-native-')) &&
        d.device_model !== 'Web Browser' &&
        !d.device_id.startsWith('web-') &&
        !d.device_id.startsWith('dev-mobile-')
    );
  }

  async revokeAndroidDevicesForAccount(accountId: string, timestamp: string): Promise<void> {
    for (const d of this.devices) {
      if (
        d.account_id === accountId &&
        d.is_active === 1 &&
        (d.device_id.startsWith('android-') || d.device_id.startsWith('android-native-')) &&
        d.device_model !== 'Web Browser' &&
        !d.device_id.startsWith('web-') &&
        !d.device_id.startsWith('dev-mobile-')
      ) {
        d.is_active = 0;
        d.last_active_at = timestamp;
      }
    }
  }

  async revokeDevicesForAccount(accountId: string, timestamp: string): Promise<void> {
    for (const d of this.devices) {
      if (d.account_id === accountId) {
        d.is_active = 0;
        d.last_active_at = timestamp;
      }
    }
  }

  async upsertDevice(
    deviceId: string,
    accountId: string,
    deviceModel: string | null,
    osVersion: string | null,
    timestamp: string
  ): Promise<void> {
    const existing = this.devices.find((d) => d.device_id === deviceId);
    if (existing) {
      existing.account_id = accountId;
      existing.device_model = deviceModel || existing.device_model;
      existing.os_version = osVersion || existing.os_version;
      existing.is_active = 1;
      existing.last_active_at = timestamp;
    } else {
      this.devices.push({
        device_id: deviceId,
        account_id: accountId,
        device_model: deviceModel,
        os_version: osVersion,
        is_active: 1,
        registered_at: timestamp,
        last_active_at: timestamp,
      });
    }
  }

  async createSession(
    sessionId: string,
    accountId: string,
    deviceId: string,
    tokenHash: string,
    expiresAt: string,
    createdAt: string
  ): Promise<void> {
    this.sessions.push({
      session_id: sessionId,
      account_id: accountId,
      device_id: deviceId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: createdAt,
      revoked_at: null,
    });
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    return this.sessions.find((s) => s.session_id === sessionId) || null;
  }

  async revokeSessionsForAccount(accountId: string, timestamp: string): Promise<void> {
    for (const s of this.sessions) {
      if (s.account_id === accountId && s.revoked_at === null) {
        s.revoked_at = timestamp;
      }
    }
  }

  async revokeSessionsForDevice(deviceId: string, timestamp: string): Promise<void> {
    for (const s of this.sessions) {
      if (s.device_id === deviceId && s.revoked_at === null) {
        s.revoked_at = timestamp;
      }
    }
  }

  async revokeSessionById(sessionId: string, timestamp: string): Promise<void> {
    const s = this.sessions.find((sess) => sess.session_id === sessionId);
    if (s) {
      s.revoked_at = timestamp;
    }
  }

  async logAuditEvent(id: string, accountId: string | null, eventType: string, details: string, timestamp: string): Promise<void> {
    this.auditLogs.push({ id, accountId, eventType, details, createdAt: timestamp });
  }
}

class InMemoryStudyRepository {
  public subjects: SubjectRecord[] = [];
  public chapters: ChapterRecord[] = [];
  public sessions: StudySessionRecord[] = [];

  async findSubjectById(subjectId: string, accountId: string): Promise<SubjectRecord | null> {
    return this.subjects.find((s) => s.id === subjectId && s.account_id === accountId) || null;
  }

  async createSubject(id: string, accountId: string, name: string, timestamp: string): Promise<SubjectRecord> {
    const rec: SubjectRecord = { id, account_id: accountId, name, created_at: timestamp, updated_at: timestamp };
    this.subjects.push(rec);
    return rec;
  }

  async findChapterById(chapterId: string, accountId: string): Promise<ChapterRecord | null> {
    return this.chapters.find((c) => c.id === chapterId && c.account_id === accountId) || null;
  }

  async findActiveSessionByAccount(accountId: string): Promise<StudySessionRecord | null> {
    return this.sessions.find((s) => s.account_id === accountId && (s.status === 'running' || s.status === 'paused')) || null;
  }

  async createSession(
    id: string,
    accountId: string,
    subjectId: string,
    chapterId: string | null,
    createdAt: string,
    updatedAt: string
  ): Promise<StudySessionRecord> {
    const rec: StudySessionRecord = {
      id,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: chapterId,
      start_time: createdAt,
      end_time: null,
      status: 'running',
      duration_seconds: 0,
      pause_duration_seconds: 0,
      created_at: createdAt,
      updated_at: updatedAt,
    };
    this.sessions.push(rec);
    return rec;
  }

  async findSessionById(id: string, accountId: string): Promise<StudySessionRecord | null> {
    return this.sessions.find((s) => s.id === id && s.account_id === accountId) || null;
  }

  async updateSessionState(
    id: string,
    accountId: string,
    status: 'running' | 'paused' | 'completed' | 'cancelled',
    durationSeconds: number,
    pauseDurationSeconds: number,
    completedAt: string | null,
    updatedAt: string
  ): Promise<StudySessionRecord | null> {
    const s = this.sessions.find((sess) => sess.id === id && sess.account_id === accountId);
    if (!s) return null;
    s.status = status;
    s.duration_seconds = durationSeconds;
    s.pause_duration_seconds = pauseDurationSeconds;
    s.end_time = completedAt;
    s.updated_at = updatedAt;
    return s;
  }
}

describe('Multi-Platform Session & Single Active Android Device Policy', () => {
  let authRepo: InMemoryAuthRepository;
  let deviceService: DeviceService;
  let sessionService: SessionService;
  const jwtSecret = 'test-jwt-secret-key-32-chars-long!';
  const accountId = 'user-acc-100';

  beforeEach(() => {
    authRepo = new InMemoryAuthRepository();
    deviceService = new DeviceService(authRepo as unknown as AuthRepository);
    sessionService = new SessionService(authRepo as unknown as AuthRepository);
  });

  it('1. Android login -> Android session active', async () => {
    const deviceId = 'android-native-device-1';
    await deviceService.registerDevice(accountId, deviceId, 'Pixel 7', 'Android 14');
    const session = await sessionService.createSession(accountId, deviceId, jwtSecret);

    const valid = await sessionService.validateSession(session.token, jwtSecret);
    expect(valid).not.toBeNull();
    expect(valid?.accountId).toBe(accountId);
    expect(valid?.deviceId).toBe(deviceId);

    const isAuthorized = await deviceService.isDeviceAuthorized(accountId, deviceId);
    expect(isAuthorized).toBe(true);
  });

  it('2. Android login -> Web login -> BOTH sessions remain valid simultaneously', async () => {
    // Android logs in
    const androidId = 'android-native-device-1';
    await deviceService.registerDevice(accountId, androidId, 'Pixel 7', 'Android 14');
    const androidSession = await sessionService.createSession(accountId, androidId, jwtSecret);

    // Web logs in with same account
    const webId = 'web-client-browser-1';
    await deviceService.registerDevice(accountId, webId, 'Web Browser', 'macOS');
    const webSession = await sessionService.createSession(accountId, webId, jwtSecret);

    // Verify Android session is STILL valid
    const androidValid = await sessionService.validateSession(androidSession.token, jwtSecret);
    expect(androidValid).not.toBeNull();
    expect(androidValid?.deviceId).toBe(androidId);
    expect(await deviceService.isDeviceAuthorized(accountId, androidId)).toBe(true);

    // Verify Web session is ALSO valid
    const webValid = await sessionService.validateSession(webSession.token, jwtSecret);
    expect(webValid).not.toBeNull();
    expect(webValid?.deviceId).toBe(webId);
    expect(await deviceService.isDeviceAuthorized(accountId, webId)).toBe(true);
  });

  it('3. Web login -> Android login -> BOTH sessions remain valid simultaneously', async () => {
    // Web logs in first
    const webId = 'web-client-browser-1';
    await deviceService.registerDevice(accountId, webId, 'Web Browser', 'macOS');
    const webSession = await sessionService.createSession(accountId, webId, jwtSecret);

    // Android logs in second
    const androidId = 'android-native-device-1';
    await deviceService.registerDevice(accountId, androidId, 'Samsung S23', 'Android 14');
    const androidSession = await sessionService.createSession(accountId, androidId, jwtSecret);

    // Both remain valid
    expect(await sessionService.validateSession(webSession.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, webId)).toBe(true);

    expect(await sessionService.validateSession(androidSession.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, androidId)).toBe(true);
  });

  it('4. Android A -> Android B login: Android A is revoked, Android B becomes active (1-Android rule)', async () => {
    const androidA = 'android-native-device-A';
    await deviceService.registerDevice(accountId, androidA, 'Pixel 6', 'Android 13');
    const sessionA = await sessionService.createSession(accountId, androidA, jwtSecret);

    const androidB = 'android-native-device-B';
    await deviceService.registerDevice(accountId, androidB, 'Pixel 8', 'Android 14');
    const sessionB = await sessionService.createSession(accountId, androidB, jwtSecret);

    // Android A must be revoked
    const validA = await sessionService.validateSession(sessionA.token, jwtSecret);
    expect(validA).toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, androidA)).toBe(false);

    // Android B must be active
    const validB = await sessionService.validateSession(sessionB.token, jwtSecret);
    expect(validB).not.toBeNull();
    expect(validB?.deviceId).toBe(androidB);
    expect(await deviceService.isDeviceAuthorized(accountId, androidB)).toBe(true);
  });

  it('5. Android A -> Android B login: Web session remains active and unaffected', async () => {
    // Android A and Web are both active
    const androidA = 'android-native-device-A';
    await deviceService.registerDevice(accountId, androidA, 'Pixel 6', 'Android 13');
    const sessionA = await sessionService.createSession(accountId, androidA, jwtSecret);

    const webId = 'web-client-browser-1';
    await deviceService.registerDevice(accountId, webId, 'Web Browser', 'Windows');
    const webSession = await sessionService.createSession(accountId, webId, jwtSecret);

    // New Android B logs in
    const androidB = 'android-native-device-B';
    await deviceService.registerDevice(accountId, androidB, 'Pixel 8', 'Android 14');
    const sessionB = await sessionService.createSession(accountId, androidB, jwtSecret);

    // Android A is revoked, Android B is active
    expect(await sessionService.validateSession(sessionA.token, jwtSecret)).toBeNull();
    expect(await sessionService.validateSession(sessionB.token, jwtSecret)).not.toBeNull();

    // Web session MUST REMAIN ACTIVE
    const webValid = await sessionService.validateSession(webSession.token, jwtSecret);
    expect(webValid).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, webId)).toBe(true);
  });

  it('6. Web A -> Web B login: Web A remains active, Web B active (multiple browsers supported)', async () => {
    const webA = 'web-client-chrome-laptop';
    await deviceService.registerDevice(accountId, webA, 'Web Browser', 'macOS');
    const sessionA = await sessionService.createSession(accountId, webA, jwtSecret);

    const webB = 'web-client-firefox-desktop';
    await deviceService.registerDevice(accountId, webB, 'Web Browser', 'Windows');
    const sessionB = await sessionService.createSession(accountId, webB, jwtSecret);

    expect(await sessionService.validateSession(sessionA.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, webA)).toBe(true);

    expect(await sessionService.validateSession(sessionB.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, webB)).toBe(true);
  });

  it('7. Same Web device re-login: old session for same device is replaced, new session is active', async () => {
    const webId = 'web-client-same-browser';
    await deviceService.registerDevice(accountId, webId, 'Web Browser', 'macOS');
    const session1 = await sessionService.createSession(accountId, webId, jwtSecret);

    // Re-authenticate on same browser
    await deviceService.registerDevice(accountId, webId, 'Web Browser', 'macOS');
    const session2 = await sessionService.createSession(accountId, webId, jwtSecret);

    // Session 1 is revoked, Session 2 is active
    expect(await sessionService.validateSession(session1.token, jwtSecret)).toBeNull();
    expect(await sessionService.validateSession(session2.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, webId)).toBe(true);
  });

  it('8. Logout Web: Web session revoked, Android session remains active', async () => {
    const androidId = 'android-native-device-1';
    await deviceService.registerDevice(accountId, androidId, 'Pixel 7', 'Android 14');
    const androidSession = await sessionService.createSession(accountId, androidId, jwtSecret);

    const webId = 'web-client-browser-1';
    await deviceService.registerDevice(accountId, webId, 'Web Browser', 'macOS');
    const webSession = await sessionService.createSession(accountId, webId, jwtSecret);

    // User logs out on Web
    await sessionService.logout(webSession.sessionId, accountId);

    // Web is revoked
    expect(await sessionService.validateSession(webSession.token, jwtSecret)).toBeNull();

    // Android is still active
    expect(await sessionService.validateSession(androidSession.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, androidId)).toBe(true);
  });

  it('9. Logout Android: Android session revoked, Web session remains active', async () => {
    const androidId = 'android-native-device-1';
    await deviceService.registerDevice(accountId, androidId, 'Pixel 7', 'Android 14');
    const androidSession = await sessionService.createSession(accountId, androidId, jwtSecret);

    const webId = 'web-client-browser-1';
    await deviceService.registerDevice(accountId, webId, 'Web Browser', 'macOS');
    const webSession = await sessionService.createSession(accountId, webId, jwtSecret);

    // User logs out on Android
    await sessionService.logout(androidSession.sessionId, accountId);

    // Android is revoked
    expect(await sessionService.validateSession(androidSession.token, jwtSecret)).toBeNull();

    // Web is still active
    expect(await sessionService.validateSession(webSession.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, webId)).toBe(true);
  });

  it('9b. Web client running on Android browser (or with Android OS metadata) is NOT revoked when native Android app logs in', async () => {
    // Web client logged in (e.g. from Chrome on Android or with legacy metadata)
    const webId = 'web-client-android-browser';
    await deviceService.registerDevice(accountId, webId, 'Web Browser', 'Android 14');
    const webSession = await sessionService.createSession(accountId, webId, jwtSecret);

    // Native Android app logs in
    const nativeAndroidId = 'android-native-device-1';
    await deviceService.registerDevice(accountId, nativeAndroidId, 'Pixel 8 Pro', 'Android 14');
    const nativeSession = await sessionService.createSession(accountId, nativeAndroidId, jwtSecret);

    // Both sessions MUST BE ACTIVE!
    expect(await sessionService.validateSession(webSession.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, webId)).toBe(true);

    expect(await sessionService.validateSession(nativeSession.token, jwtSecret)).not.toBeNull();
    expect(await deviceService.isDeviceAuthorized(accountId, nativeAndroidId)).toBe(true);
  });
});

describe('Cross-Platform Study Session Invariant (Single Active Study Session per Account)', () => {
  let studyRepo: InMemoryStudyRepository;
  let studyService: StudyService;
  const accountId = 'user-acc-100';
  const subjectId = 'subj-physics-101';

  beforeEach(async () => {
    studyRepo = new InMemoryStudyRepository();
    studyService = new StudyService(studyRepo as unknown as StudyRepository);
    await studyRepo.createSubject(subjectId, accountId, 'Physics', new Date().toISOString());
  });

  it('10 & 11. Android starts study session S1 -> Web fetches active study session and receives S1', async () => {
    const s1 = await studyService.startSession(accountId, subjectId);
    expect(s1.status).toBe('running');

    // Web client queries active study session
    const activeOnWeb = await studyService.getActiveSession(accountId);
    expect(activeOnWeb).not.toBeNull();
    expect(activeOnWeb?.id).toBe(s1.id);
    expect(activeOnWeb?.subjectId).toBe(subjectId);
    expect(activeOnWeb?.status).toBe('running');
  });

  it('12, 13 & 14. Web cannot start S2 while S1 is active (STUDY_ACTIVE_SESSION_EXISTS invariant)', async () => {
    const s1 = await studyService.startSession(accountId, subjectId);

    // Web attempts to start another session while S1 is running
    await expect(studyService.startSession(accountId, subjectId)).rejects.toThrow('STUDY_ACTIVE_SESSION_EXISTS');

    // Active session remains exactly S1
    const active = await studyService.getActiveSession(accountId);
    expect(active?.id).toBe(s1.id);
  });

  it('15. Ending S1 from Web makes it inactive for both Android and Web', async () => {
    const s1 = await studyService.startSession(accountId, subjectId);

    // Web ends the session
    const ended = await studyService.endSession(accountId, s1.id);
    expect(ended.status).toBe('completed');

    // Neither Android nor Web sees an active session
    const active = await studyService.getActiveSession(accountId);
    expect(active).toBeNull();
  });

  it('16. Android + Web authentication coexists while exactly ONE study session exists', async () => {
    // Start session
    const s1 = await studyService.startSession(accountId, subjectId);
    expect(s1.status).toBe('running');

    // Pause from Android
    const paused = await studyService.pauseSession(accountId, s1.id);
    expect(paused.status).toBe('paused');

    // Web inspects paused session
    const activeOnWeb = await studyService.getActiveSession(accountId);
    expect(activeOnWeb?.status).toBe('paused');
    expect(activeOnWeb?.id).toBe(s1.id);

    // Resume from Web
    const resumed = await studyService.resumeSession(accountId, s1.id);
    expect(resumed.status).toBe('running');

    // End session from Android
    const finished = await studyService.endSession(accountId, s1.id);
    expect(finished.status).toBe('completed');
    expect(await studyService.getActiveSession(accountId)).toBeNull();
  });
});
