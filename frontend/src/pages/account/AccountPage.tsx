import React, { useState, useEffect } from 'react';
import { useAccount } from '../../context/AccountContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '@student-os/ui';
import { EntitlementDto, PlanDto, PaymentConfigDto } from '@student-os/shared';
import { EntitlementService } from '../../services/entitlementService.js';
import { UpgradeModal } from '../../components/entitlement/UpgradeModal.js';

export const AccountPage: React.FC = () => {
  const { overview, profile, preferences, devices, loading, error, updateProfile, updatePreferences, revokeDevice, deleteAccount } =
    useAccount();
  const { logout } = useAuth();

  // Form states
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [course, setCourse] = useState(profile?.course || '');
  const [institutionName, setInstitutionName] = useState(profile?.institutionName || '');
  const [classYear, setClassYear] = useState(profile?.classYear || '');
  const [stream, setStream] = useState(profile?.stream || '');
  const [targetMins, setTargetMins] = useState(profile?.preferredDailyStudyTargetMinutes || 120);
  const [sessionMins, setSessionMins] = useState(profile?.preferredSessionDurationMinutes || 45);
  const [studyTime, setStudyTime] = useState<'morning' | 'afternoon' | 'evening' | 'night'>(
    profile?.preferredStudyTime || 'morning'
  );
  const [revStrategy, setRevStrategy] = useState<'spaced' | 'daily' | 'weekly'>(
    profile?.preferredRevisionStrategy || 'spaced'
  );

  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(preferences?.theme || 'system');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(preferences?.timeFormat || '24h');
  const [breakInterval, setBreakInterval] = useState(preferences?.breakReminderIntervalMinutes || 50);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Subscription and entitlement state
  const [entitlement, setEntitlement] = useState<EntitlementDto | null>(null);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigDto | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    EntitlementService.getEntitlement().then(setEntitlement).catch(() => {});
    EntitlementService.getPlans().then(setPlans).catch(() => {});
    EntitlementService.getPaymentConfig().then(setPaymentConfig).catch(() => {});
  }, []);

  // Sync state when profile loads
  React.useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setCourse(profile.course || '');
      setInstitutionName(profile.institutionName || '');
      setClassYear(profile.classYear || '');
      setStream(profile.stream || '');
      setTargetMins(profile.preferredDailyStudyTargetMinutes || 120);
      setSessionMins(profile.preferredSessionDurationMinutes || 45);
      setStudyTime(profile.preferredStudyTime || 'morning');
      setRevStrategy(profile.preferredRevisionStrategy || 'spaced');
    }
    if (preferences) {
      setTheme(preferences.theme || 'system');
      setTimeFormat(preferences.timeFormat || '24h');
      setBreakInterval(preferences.breakReminderIntervalMinutes || 50);
    }
  }, [profile, preferences]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setSuccessMsg(null);
      await updateProfile({
        fullName,
        course: course || null,
        institutionName: institutionName || null,
        classYear: classYear || null,
        stream: stream || null,
        preferredDailyStudyTargetMinutes: Number(targetMins),
        preferredSessionDurationMinutes: Number(sessionMins),
        preferredStudyTime: studyTime,
        preferredRevisionStrategy: revStrategy,
      });
      setSuccessMsg('Profile updated successfully');
    } catch {
      // error handled in context
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPref(true);
      setSuccessMsg(null);
      await updatePreferences({
        theme,
        timeFormat,
        breakReminderIntervalMinutes: Number(breakInterval),
      });
      setSuccessMsg('Preferences saved successfully');
    } catch {
      // error handled in context
    } finally {
      setSavingPref(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (window.confirm('Are you sure you want to revoke this device session?')) {
      await revokeDevice(deviceId);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    try {
      setDeleting(true);
      await deleteAccount();
      logout();
    } catch {
      setDeleting(false);
    }
  };

  if (loading && !overview) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
        Loading account details...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', fontFamily: 'var(--font-family-base)' }}>
      {/* Header Banner */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
          User Account & Personalization
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
          Manage your personal profile, academic goals, preferences, devices, and data privacy
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          style={{
            padding: 'var(--spacing-xs) var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            fontSize: '0.85rem',
          }}
        >
          <strong>⚠️ {error}</strong>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          style={{
            padding: 'var(--spacing-xs) var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#166534',
            fontSize: '0.85rem',
          }}
        >
          <strong>✓ {successMsg}</strong>
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--spacing-md)' }}>
        {/* SUBSCRIPTION & PLAN DETAILS CARD */}
        {(() => {
          const isPaid = entitlement?.isPaid === true;
          const isExpired = entitlement?.status === 'expired';
          const planName = entitlement?.currentPlanId === 'yearly'
            ? 'Yearly (365 Days)'
            : entitlement?.currentPlanId === 'monthly'
            ? 'Monthly (30 Days)'
            : '7-Day Free Trial';
          const statusText = isExpired ? 'Expired' : isPaid ? 'Active' : 'Trial Active';
          const statusColor = isExpired ? '#dc2626' : isPaid ? '#10b981' : 'var(--color-accent)';

          return (
            <section
              style={{
                gridColumn: '1 / -1',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: isPaid ? 'rgba(245, 158, 11, 0.15)' : 'rgba(37, 99, 235, 0.12)',
                      border: isPaid ? '1.5px solid rgba(245, 158, 11, 0.5)' : '1.5px solid rgba(37, 99, 235, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    {isPaid ? '👑' : '⏳'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                      {isPaid ? 'Student OS Pro' : 'Student OS Free Trial'}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Subscription & Feature Access
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.12)' : isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.12)',
                    color: statusColor,
                    border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.3)' : isPaid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(37, 99, 235, 0.3)'}`,
                  }}
                >
                  {statusText}
                </span>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>Plan</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    {planName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>Expires</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    {entitlement?.expiresAt
                      ? new Date(entitlement.expiresAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : 'Active'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '4px' }}>
                <Button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  style={{
                    backgroundColor: isPaid && !isExpired ? 'transparent' : 'var(--color-accent)',
                    border: isPaid && !isExpired ? '1px solid var(--color-border)' : 'none',
                    color: isPaid && !isExpired ? 'var(--color-text-primary)' : '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    height: '36px',
                    padding: '0 18px',
                  }}
                >
                  {isPaid && !isExpired ? 'Manage / Change Plan' : 'Upgrade to Student OS Pro'}
                </Button>
              </div>
            </section>
          );
        })()}

        {/* SECTION 1: PERSONAL & ACADEMIC PROFILE */}
        <section
          style={{
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
            Personal & Academic Information
          </h3>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Registered Email (Read-Only)</label>
              <input
                type="email"
                value={overview?.email || ''}
                disabled
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.85rem',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Course / Program</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech Computer Science"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Class / Year</label>
                <input
                  type="text"
                  placeholder="e.g. 3rd Year"
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Stream / Field</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Institution Name</label>
                <input
                  type="text"
                  placeholder="e.g. State University"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {/* STUDY TARGET PREFERENCES */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Daily Target (mins)</label>
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={targetMins}
                  onChange={(e) => setTargetMins(Number(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Session Duration (mins)</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={sessionMins}
                  onChange={(e) => setSessionMins(Number(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Preferred Study Time</label>
                <select
                  value={studyTime}
                  onChange={(e) => setStudyTime(e.target.value as 'morning' | 'afternoon' | 'evening' | 'night')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Revision Strategy</label>
                <select
                  value={revStrategy}
                  onChange={(e) => setRevStrategy(e.target.value as 'spaced' | 'daily' | 'weekly')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="spaced">Spaced Repetition (Recommended)</option>
                  <option value="daily">Daily Review</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={savingProfile} style={{ marginTop: 'var(--spacing-xs)' }}>
              {savingProfile ? 'Saving...' : 'Update Profile'}
            </Button>
          </form>
        </section>

        {/* SECTION 2: APPLICATION PREFERENCES & THEME */}
        <section
          style={{
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-sm)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
            Application Preferences & Settings
          </h3>

          <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Theme Mode</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'system' | 'light' | 'dark')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="system">System Default</option>
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Time Format</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="12h">12-Hour (AM / PM)</option>
                <option value="24h">24-Hour Clock</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Break Reminder Interval (mins)</label>
              <input
                type="number"
                min="10"
                max="180"
                value={breakInterval}
                onChange={(e) => setBreakInterval(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <Button type="submit" disabled={savingPref} style={{ marginTop: 'var(--spacing-xs)' }}>
              {savingPref ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>

          {/* SECTION 3: DEVICE MANAGEMENT */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
            Authenticated Devices ({devices.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {devices.map((d) => (
              <div
                key={d.deviceId}
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    {d.deviceModel || 'Web Browser'} {d.isCurrentDevice && <span style={{ color: 'var(--color-accent)', fontSize: '0.72rem' }}>(Current)</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    OS: {d.osVersion || 'Unknown'} • Last active: {new Date(d.lastActiveAt).toLocaleString()}
                  </div>
                </div>

                {!d.isCurrentDevice && (
                  <Button variant="secondary" onClick={() => handleRevokeDevice(d.deviceId)} style={{ fontSize: '0.75rem', padding: '2px 8px', height: '26px' }}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* SECTION 4: DATA & ACCOUNT DELETION */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#991b1b' }}>Danger Zone</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Permanently remove your account and data
              </p>
            </div>
            <Button variant="secondary" onClick={() => setShowDeleteModal(true)} style={{ borderColor: '#fca5a5', color: '#991b1b', fontSize: '0.8rem' }}>
              Delete Account
            </Button>
          </div>
        </section>
      </div>

      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-md)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-md)',
              maxWidth: '440px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)',
            }}
          >
            <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.1rem', fontWeight: '700' }}>
              Permanent Account Deletion Request
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
              This action is permanent and cannot be undone. All your study sessions, planner tasks, revision schedules, and historical analytics will be completely erased.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={confirmText !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade & Subscription Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        plans={plans}
        contactWhatsApp={paymentConfig?.contactWhatsApp}
        accountEmail={overview?.email || ''}
        entitlement={entitlement}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
};
