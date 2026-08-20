import React, { useState } from 'react';
import { Button } from '@student-os/ui';
import { Plus, BookOpen, Clock, AlertCircle, Play, Pause, CheckCircle2, X } from 'lucide-react';
import { useStudy } from '../../context/StudyContext.js';
import { SubjectModal } from '../../components/study/SubjectModal.js';
import { ChapterModal } from '../../components/study/ChapterModal.js';
import { SubjectDTO, ChapterDTO } from '@student-os/shared';

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function formatTimeString(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

export const StudyPage: React.FC = () => {
  const {
    subjects,
    selectedSubjectId,
    chapters,
    activeSession,
    todaySummary,
    elapsedSeconds,
    errorMessage,
    setSelectedSubjectId,
    createSubject,
    updateSubject,
    deleteSubject,
    createChapter,
    updateChapter,
    deleteChapter,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    cancelSession,
  } = useStudy();

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<SubjectDTO | null>(null);

  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [chapterToEdit, setChapterToEdit] = useState<ChapterDTO | null>(null);

  const [selectedChapterIdForStart, setSelectedChapterIdForStart] = useState<string>('');

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Active session metadata
  const activeSubject = subjects.find((s) => s.id === activeSession?.subjectId);
  const activeChapter = chapters.find((c) => c.id === activeSession?.chapterId);

  const handleStartSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;
    await startSession(selectedSubjectId, selectedChapterIdForStart || null);
    setSelectedChapterIdForStart('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', fontFamily: 'var(--font-family-base)' }}>
      {/* Error Alert */}
      {errorMessage && (
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
          <span>{errorMessage}</span>
        </div>
      )}

      {/* WORKFLOW TOP ROW: 1. SUBJECTS & 2. CHAPTERS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
        {/* 1. SUBJECT MANAGEMENT CARD */}
        <section
          aria-labelledby="subjects-heading"
          style={{
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            <div>
              <h2 id="subjects-heading" style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>
                Subjects
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
                Primary workspace topic
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setSubjectToEdit(null);
                setIsSubjectModalOpen(true);
              }}
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem', height: '32px', gap: '4px' }}
            >
              <Plus size={13} />
              <span>Subject</span>
            </Button>
          </div>

          {/* Subject Content / Compact Empty State */}
          {subjects.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
                textAlign: 'center',
                minHeight: '120px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ marginBottom: '4px' }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Create your first subject to begin studying.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--spacing-xs)' }}>
              {subjects.map((s) => {
                const isSelected = s.id === selectedSubjectId;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSubjectId(s.id)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedSubjectId(s.id);
                      }
                    }}
                    style={{
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '64px',
                      boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.1)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: isSelected ? '700' : '500',
                        fontSize: '0.88rem',
                        color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.name}
                    </span>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubjectToEdit(s);
                          setIsSubjectModalOpen(true);
                        }}
                        aria-label={`Edit ${s.name}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.75rem',
                          padding: '1px 4px',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete subject "${s.name}"? This will also remove its associated chapters.`)) {
                            deleteSubject(s.id);
                          }
                        }}
                        aria-label={`Delete ${s.name}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#dc2626',
                          fontSize: '0.75rem',
                          padding: '1px 4px',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. CHAPTER MANAGEMENT CARD */}
        <section
          aria-labelledby="chapters-heading"
          style={{
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            <div>
              <h2 id="chapters-heading" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
                Chapters {selectedSubject ? `(${selectedSubject.name})` : ''}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
                Topic modules & completion
              </p>
            </div>
            {selectedSubjectId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setChapterToEdit(null);
                  setIsChapterModalOpen(true);
                }}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', height: '34px' }}
              >
                + Chapter
              </Button>
            )}
          </div>

          {!selectedSubjectId ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
                textAlign: 'center',
                minHeight: '120px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ marginBottom: '4px' }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Select a subject on the left to view chapters.
              </p>
            </div>
          ) : chapters.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
                textAlign: 'center',
                minHeight: '120px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ marginBottom: '4px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Create your first chapter for <strong>{selectedSubject?.name}</strong>.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {chapters.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer', flex: 1, overflow: 'hidden' }}>
                    <input
                      type="checkbox"
                      checked={c.isCompleted}
                      onChange={(e) => updateChapter(c.id, undefined, undefined, e.target.checked)}
                      style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        color: c.isCompleted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                        textDecoration: c.isCompleted ? 'line-through' : 'none',
                        fontSize: '0.85rem',
                        fontWeight: c.isCompleted ? '400' : '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.name}
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setChapterToEdit(c);
                        setIsChapterModalOpen(true);
                      }}
                      aria-label={`Edit ${c.name}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete chapter "${c.name}"?`)) {
                          deleteChapter(c.id);
                        }
                      }}
                      aria-label={`Delete ${c.name}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 3. CONTEXTUAL STUDY SESSION CARD */}
      <section
        aria-labelledby="session-heading"
        style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: activeSession ? (activeSession.status === 'paused' ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)') : 'var(--color-bg-secondary)',
          border: activeSession ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
          boxShadow: activeSession ? 'var(--shadow-md)' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
          <h2 id="session-heading" style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>
            Study Session
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
                backgroundColor: activeSession.status === 'paused' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                color: activeSession.status === 'paused' ? '#f59e0b' : 'var(--color-accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {activeSession.status === 'paused' ? <Pause size={11} /> : <Clock size={11} />}
              <span>{activeSession.status === 'paused' ? 'Paused' : 'Running'}</span>
            </span>
          )}
        </div>

        {/* ACTIVE SESSION DISPLAY */}
        {activeSession ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xs) 0' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-primary)', margin: '0 0 2px 0', fontWeight: '600' }}>
              {activeSubject?.name || 'Subject'}
            </h3>
            {activeChapter && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', margin: 0 }}>
                Chapter: {activeChapter.name}
              </p>
            )}

            {/* HIGH-CONTRAST DIGITAL TIMER FOCUS */}
            <div
              style={{
                fontSize: '2.75rem',
                fontWeight: '600',
                fontVariantNumeric: 'tabular-nums',
                color: activeSession.status === 'paused' ? 'var(--color-text-secondary)' : 'var(--color-accent)',
                margin: 'var(--spacing-xs) 0',
                letterSpacing: '-0.02em',
              }}
            >
              {formatDuration(elapsedSeconds)}
            </div>

            {/* UNIFIED BUTTON CONTROLS */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: 'var(--spacing-xs)' }}>
              {activeSession.status === 'running' ? (
                <Button type="button" variant="secondary" onClick={pauseSession} style={{ height: '34px', fontSize: '0.82rem', gap: '5px' }}>
                  <Pause size={14} />
                  <span>Pause Session</span>
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={resumeSession} style={{ height: '34px', fontSize: '0.82rem', gap: '5px' }}>
                  <Play size={14} />
                  <span>Resume Session</span>
                </Button>
              )}
              <Button type="button" variant="primary" onClick={endSession} style={{ height: '34px', fontSize: '0.82rem', gap: '5px' }}>
                <CheckCircle2 size={14} />
                <span>Complete & Save</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={cancelSession}
                style={{ height: '34px', fontSize: '0.82rem', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.3)', gap: '5px' }}
              >
                <X size={14} />
                <span>Cancel</span>
              </Button>
            </div>
          </div>
        ) : (
          /* IDLE SESSION STATE WITH ILLUSTRATION / COMPACT FORM */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1, minWidth: '240px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>

              <div>
                {!selectedSubject ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                    Select a subject above to enable study session recording.
                  </p>
                ) : (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Ready to study:
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                      {selectedSubject.name}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {selectedSubject && (
              <form onSubmit={handleStartSessionSubmit} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                {chapters.length > 0 && (
                  <select
                    id="start-chapter-select"
                    value={selectedChapterIdForStart}
                    onChange={(e) => setSelectedChapterIdForStart(e.target.value)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.85rem',
                      height: '36px',
                    }}
                  >
                    <option value="">-- Entire Subject --</option>
                    {chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.isCompleted ? '(Done)' : ''}
                      </option>
                    ))}
                  </select>
                )}

                <Button type="submit" variant="primary" style={{ height: '36px', fontSize: '0.85rem', fontWeight: '600' }}>
                  Start Study Session
                </Button>
              </form>
            )}
          </div>
        )}
      </section>

      {/* 4. TODAY'S SUMMARY — REORGANIZED CLEAN 2-COLUMN LAYOUT */}
      <section
        aria-labelledby="history-heading"
        style={{
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
          <h2 id="history-heading" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
            Today's Focus Summary
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
            Productive study timeline ({todaySummary?.date || new Date().toISOString().split('T')[0]})
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-md)', alignItems: 'start' }}>
          {/* STAT CARDS COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <div
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Total Focus Time
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-accent)', marginTop: '2px' }}>
                  {formatDuration(todaySummary?.totalDurationSeconds || 0)}
                </div>
              </div>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>

            <div
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Completed Sessions
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {todaySummary?.completedSessionsCount || 0}
                </div>
              </div>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>

          {/* TIMELINE LOG COLUMN */}
          <div style={{ flex: 1 }}>
            {!todaySummary || todaySummary.sessions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ marginBottom: '4px' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p style={{ margin: 0 }}>No study sessions recorded today yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {todaySummary.sessions.map((sess) => {
                  const subj = subjects.find((s) => s.id === sess.subjectId);
                  const chap = chapters.find((c) => c.id === sess.chapterId);
                  return (
                    <div
                      key={sess.id}
                      style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{subj?.name || 'Subject'}</strong>
                        {chap && <span style={{ color: 'var(--color-text-secondary)', marginLeft: '4px' }}>• {chap.name}</span>}
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '1px' }}>
                          Started at {formatTimeString(sess.startTime)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            backgroundColor:
                              sess.status === 'completed'
                                ? '#dcfce7'
                                : sess.status === 'cancelled'
                                ? '#fee2e2'
                                : '#fef3c7',
                            color:
                              sess.status === 'completed'
                                ? '#166534'
                                : sess.status === 'cancelled'
                                ? '#991b1b'
                                : '#92400e',
                          }}
                        >
                          {sess.status.toUpperCase()}
                        </span>
                        <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', marginTop: '1px', fontSize: '0.8rem' }}>
                          {formatDuration(sess.durationSeconds)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MODALS */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        subjectToEdit={subjectToEdit}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setSubjectToEdit(null);
        }}
        onSave={async (name) => {
          if (subjectToEdit) {
            await updateSubject(subjectToEdit.id, name);
          } else {
            await createSubject(name);
          }
        }}
      />

      <ChapterModal
        isOpen={isChapterModalOpen}
        chapterToEdit={chapterToEdit}
        onClose={() => {
          setIsChapterModalOpen(false);
          setChapterToEdit(null);
        }}
        onSave={async (name) => {
          if (!selectedSubjectId) return;
          if (chapterToEdit) {
            await updateChapter(chapterToEdit.id, name);
          } else {
            await createChapter(selectedSubjectId, name);
          }
        }}
      />
    </div>
  );
};
