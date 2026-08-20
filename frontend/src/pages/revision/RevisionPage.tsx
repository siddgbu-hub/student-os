import React, { useState } from 'react';
import { useRevision } from '../../context/RevisionContext.js';
import { useStudy } from '../../context/StudyContext.js';
import { RevisionService } from '../../services/revisionService.js';
import { Button } from '@student-os/ui';
import { RevisionItemDTO } from '@student-os/shared';
import { RevisionModal } from '../../components/revision/RevisionModal.js';
import { RotateCcw, AlertCircle, Clock, Play, Pause, CheckCircle2, X, Plus, Calendar } from 'lucide-react';

export const RevisionPage: React.FC = () => {
  const {
    items,
    summary,
    activeSession,
    elapsedSeconds,
    isPaused,
    loading,
    error,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    cancelSession,
    rescheduleItem,
    archiveItem,
    fetchRevisionData,
  } = useRevision();

  const { subjects, chapters } = useStudy();

  const [activeTab, setActiveTab] = useState<'due_today' | 'overdue' | 'upcoming' | 'completed'>('due_today');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [itemToReschedule, setItemToReschedule] = useState<RevisionItemDTO | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>('');

  const formatTimer = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hours > 0 ? `${pad(hours)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  const getSubjectName = (subjectId: string): string => {
    const s = subjects.find((sub) => sub.id === subjectId);
    return s ? s.name : 'Subject';
  };

  const getChapterName = (chapterId?: string | null): string => {
    if (!chapterId) return 'Entire Subject';
    const c = chapters.find((chap) => chap.id === chapterId);
    return c ? c.name : 'Chapter';
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'due_today') return item.status === 'due_today';
    if (activeTab === 'overdue') return item.status === 'overdue';
    if (activeTab === 'upcoming') return item.status === 'scheduled';
    if (activeTab === 'completed') return item.status === 'completed';
    return true;
  });

  const activeItem = activeSession ? items.find((i) => i.id === activeSession.revisionItemId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', fontFamily: 'var(--font-family-base)' }}>
      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--color-error)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* METRIC CARDS HEADER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-sm)' }}>
        <div
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
            Due Today
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-accent)', marginTop: '2px' }}>
            {summary?.dueTodayCount || 0}
          </div>
        </div>

        <div
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
            Overdue
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: (summary?.overdueCount || 0) > 0 ? '#dc2626' : 'var(--color-text-primary)', marginTop: '2px' }}>
            {summary?.overdueCount || 0}
          </div>
        </div>

        <div
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
            Completed Today
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#166534', marginTop: '2px' }}>
            {summary?.completedTodayCount || 0}
          </div>
        </div>

        <div
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
            Retention Score
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
            {summary?.averageRetentionScore || 100}%
          </div>
        </div>
      </div>

      {/* DEDICATED ACTIVE REVISION SESSION CARD */}
      <section
        style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: activeSession ? (isPaused ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)') : 'var(--color-bg-secondary)',
          border: activeSession ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
          boxShadow: activeSession ? '0 4px 16px rgba(37, 99, 235, 0.12)' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
            Revision Session
          </h2>
          {activeSession && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.72rem',
                fontWeight: '600',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                backgroundColor: isPaused ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                color: isPaused ? '#f59e0b' : 'var(--color-revision)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isPaused ? <Pause size={11} /> : <Clock size={11} />}
              <span>{isPaused ? 'Paused' : 'Active Revision'}</span>
            </span>
          )}
        </div>

        {activeSession ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xs) 0' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
              Revision Stage {activeSession.revisionStage} of 4
            </span>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', margin: '4px 0 2px 0', fontWeight: '700' }}>
              {getSubjectName(activeSession.subjectId)}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--spacing-sm) 0' }}>
              {getChapterName(activeSession.chapterId)}
              {activeItem?.createdAt && ` • Learned on ${new Date(activeItem.createdAt).toLocaleDateString()}`}
            </p>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'var(--color-text-primary)',
                margin: 'var(--spacing-sm) 0',
                letterSpacing: '0.05em',
              }}
            >
              {formatTimer(elapsedSeconds)}
            </div>

            <div style={{ maxWidth: '400px', margin: '0 auto var(--spacing-sm) auto' }}>
              <input
                type="text"
                placeholder="Session recall notes (optional)..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {isPaused ? (
                <Button type="button" variant="primary" onClick={resumeSession} style={{ height: '34px', fontSize: '0.82rem', gap: '5px' }}>
                  <Play size={14} />
                  <span>Resume Session</span>
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={pauseSession} style={{ height: '34px', fontSize: '0.82rem', gap: '5px' }}>
                  <Pause size={14} />
                  <span>Pause Session</span>
                </Button>
              )}

              <Button
                type="button"
                variant="primary"
                onClick={() => endSession('good', completionNotes)}
                style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#ffffff', height: '34px', fontSize: '0.82rem', gap: '5px' }}
              >
                <CheckCircle2 size={14} />
                <span>Complete & Save</span>
              </Button>

              <Button type="button" variant="secondary" onClick={cancelSession} style={{ height: '34px', fontSize: '0.82rem', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.3)', gap: '5px' }}>
                <X size={14} />
                <span>Cancel</span>
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0 0 var(--spacing-sm) 0' }}>
              Select a revision item below to start reinforcing previously learned material.
            </p>
          </div>
        )}
      </section>

      {/* REVISION WORKSPACE CARDS */}
      <section
        style={{
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
        }}
      >
        {/* WORKSPACE HEADER & TABS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
          <div
            style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('due_today')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'due_today' ? 'var(--color-bg-secondary)' : 'transparent',
                color: activeTab === 'due_today' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'due_today' ? '600' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Due Today ({summary?.dueTodayCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('overdue')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'overdue' ? 'var(--color-bg-secondary)' : 'transparent',
                color: activeTab === 'overdue' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'overdue' ? '600' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Overdue ({summary?.overdueCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'upcoming' ? 'var(--color-bg-secondary)' : 'transparent',
                color: activeTab === 'upcoming' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'upcoming' ? '600' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'completed' ? 'var(--color-bg-secondary)' : 'transparent',
                color: activeTab === 'completed' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'completed' ? '600' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Completed
            </button>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setItemToReschedule(null);
              setIsModalOpen(true);
            }}
            style={{ height: '36px', fontSize: '0.85rem' }}
          >
            + Schedule Revision
          </Button>
        </div>

        {/* ITEMS LIST / EMPTY STATE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
            Loading revision workspace...
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-lg)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border)',
              backgroundColor: 'var(--color-bg-primary)',
              textAlign: 'center',
              minHeight: '160px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ marginBottom: '8px' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              No revisions found in this view
            </h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', margin: 0 }}>
              Completed study sessions automatically create scheduled revisions.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                      Stage {item.revisionStage} Revision
                    </span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                      {getSubjectName(item.subjectId)}
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {getChapterName(item.chapterId)}
                    </span>
                  </div>

                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      backgroundColor:
                        item.status === 'overdue'
                          ? '#fef2f2'
                          : item.status === 'due_today'
                          ? '#dbeafe'
                          : item.status === 'completed'
                          ? '#f0fdf4'
                          : 'var(--color-bg-secondary)',
                      color:
                        item.status === 'overdue'
                          ? '#dc2626'
                          : item.status === 'due_today'
                          ? '#1e40af'
                          : item.status === 'completed'
                          ? '#166534'
                          : 'var(--color-text-secondary)',
                    }}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>

                {item.notes && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                    "{item.notes}"
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-xs)', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  <span>Scheduled: {item.scheduledDate}</span>
                  <span>Completed: {item.totalRevisionCount} times</span>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                  {item.status !== 'completed' && !activeSession && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => startSession(item.id)}
                      style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', height: '30px', flex: 1, gap: '4px' }}
                    >
                      <Play size={13} />
                      <span>Start Session</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setItemToReschedule(item);
                      setIsModalOpen(true);
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', height: '30px' }}
                  >
                    Reschedule
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => archiveItem(item.id)}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', height: '30px', color: 'var(--color-text-muted)' }}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SCHEDULE / RESCHEDULE MODAL */}
      <RevisionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setItemToReschedule(null);
        }}
        onSave={async (data) => {
          if (itemToReschedule) {
            await rescheduleItem(itemToReschedule.id, { scheduledDate: data.scheduledDate });
          } else {
            await RevisionService.createRevisionItem(data);
            await fetchRevisionData();
          }
        }}
        subjects={subjects}
        chapters={chapters}
        itemToReschedule={itemToReschedule}
      />
    </div>
  );
};
