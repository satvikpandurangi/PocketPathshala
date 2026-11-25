import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  DetailSchema,
  FlushSchema,
  GroupsSchema,
  SetupSchema,
  StatsSchema,
  SKILLS,
} from '@pp/shared';
import { api } from './api';
import { Brand } from './student';
import { Avatar, Icon, LearnerDialog } from './ui';
type Groups = z.infer<typeof GroupsSchema>;
type Stats = z.infer<typeof StatsSchema>;
type Detail = z.infer<typeof DetailSchema>;
type Setup = z.infer<typeof SetupSchema>;
const size = (bytes: number) =>
  bytes < 1000000
    ? `${(bytes / 1000).toFixed(1)} KB`
    : `${(bytes / 1000000).toFixed(2)} MB`;
export function TeacherApp() {
  const [view, setView] = useState<'groups' | 'setup' | 'stats'>('groups'),
    [groups, setGroups] = useState<Groups>(),
    [stats, setStats] = useState<Stats>(),
    [setup, setSetup] = useState<Setup>(),
    [detail, setDetail] = useState<Detail>(),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [updating, setUpdating] = useState(false);
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const load = useCallback(async () => {
    try {
      const [g, s] = await Promise.all([
        api('', '/api/teacher/groups', GroupsSchema),
        api('', '/api/teacher/stats', StatsSchema),
      ]);
      setGroups(g);
      setStats(s);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Teacher hub is unavailable. Start pnpm dev.',
      );
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (view === 'setup')
      void api('', '/api/teacher/setup', SetupSchema)
        .then(setSetup)
        .catch((e) => setError(String(e)));
  }, [view]);
  async function showLearner(id: string) {
    try {
      setDetail(
        await api(
          '',
          '/api/teacher/learner/' + encodeURIComponent(id),
          DetailSchema,
        ),
      );
    } catch (e) {
      setError(String(e));
    }
  }
  async function flush() {
    setUpdating(true);
    try {
      const result = await api('', '/api/cloud/flush', FlushSchema, {});
      setMessage(
        `${result.count} answers sent · ${size(result.bytes)} gzip payload to the local simulator.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdating(false);
    }
  }
  async function advance() {
    try {
      await api(
        '',
        '/api/teacher/clock',
        z.object({ time: z.number(), dayMs: z.number() }),
        { advanceDays: 1, dayMs: 60000 },
      );
      setMessage(
        'Demo clock advanced one day. Sync the student device to refresh review time.',
      );
      await load();
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <div className="teacher-shell">
      <aside className="sidebar">
        <Brand />
        <div className="classroom-label">
          <span className="classroom-mark">
            <Icon name="people" />
          </span>
          <div>
            <strong>Ravi sir’s classroom</strong>
            <span>Klarity demo school</span>
          </div>
        </div>
        <nav aria-label="Teacher navigation">
          {(['groups', 'setup', 'stats'] as const).map((v, i) => (
            <button
              key={v}
              className={view === v ? 'active' : ''}
              onClick={() => {
                setView(v);
                setDetail(undefined);
              }}
            >
              <Icon name={(['grid', 'settings', 'chart'] as const)[i]} />
              {['Today’s groups', 'Classroom setup', 'Data & sync'][i]}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            A shared classroom.
            <br />
            <strong>A path for every learner.</strong>
          </p>
          <a href="/">← Open student space</a>
          <span>Team Klarity · wHACKiest 2026</span>
        </div>
      </aside>
      <div className="teacher-content">
        <header className="teacher-top">
          <span>
            Teacher space{' '}
            <span className="muted">
              /{' '}
              {view === 'groups'
                ? 'Today’s groups'
                : view === 'setup'
                  ? 'Classroom setup'
                  : 'Data & sync'}
            </span>
          </span>
          <span className="status-pill connected">
            <span className="status-dot" />
            Local classroom hub
          </span>
        </header>
        <main className="teacher-main">
          <div className="teacher-heading">
            <div>
              <p className="hand-note">Small steps. Shared progress.</p>
              <h1>
                {view === 'groups'
                  ? 'Every child, at their own pace.'
                  : view === 'setup'
                    ? 'Your classroom, connected.'
                    : 'Small data. More learning.'}
              </h1>
              <p>
                {view === 'groups'
                  ? 'Teach the skill they need today. Their grade can wait.'
                  : view === 'setup'
                    ? 'Bring everyone onto the same hotspot. No mobile data needed.'
                    : 'Keep classroom traffic local. Send only progress when you choose.'}
              </p>
            </div>
            <button
              className="outline"
              onClick={() => {
                void load();
              }}
            >
              ↻ Refresh
            </button>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="message-banner" role="status">
              {message}
            </div>
          )}
          <div className="metrics">
            <div>
              <span>Learners in this classroom</span>
              <strong>
                {groups?.groups.reduce((n, g) => n + g.learners.length, 0) ??
                  '—'}{' '}
                <small>across 5 grades</small>
              </strong>
            </div>
            <div>
              <span>Practice answers saved</span>
              <strong>
                {stats?.attemptCount ?? '—'} <small>on the hub</small>
              </strong>
            </div>
            <div>
              <span>Mobile cloud payload</span>
              <strong>
                {size(stats?.cloudBytes ?? 0)} <small>local simulation</small>
              </strong>
            </div>
          </div>
          {view === 'groups' ? (
            <>
              <section className="group-heading">
                <h2>Bring them together</h2>
                <span>Grouped by skill, not by grade · Refreshes every 5s</span>
              </section>
              <div className="groups-grid">
                {groups?.groups.map((g) => (
                  <article
                    className={`group-card ${g.skillId === 'NEEDS_YOU' ? 'needs-you' : ''}`}
                    key={g.skillId}
                  >
                    <div className="group-card-top">
                      <span className="group-letter">
                        <Icon
                          name={
                            g.skillId === 'NEEDS_YOU'
                              ? 'people'
                              : g.skillId === 'ALL_MASTERED'
                                ? 'check'
                                : 'book'
                          }
                        />
                      </span>
                      <span>
                        {g.learners.length} learner
                        {g.learners.length !== 1 ? 's' : ''}
                      </span>
                      <span className="group-count">
                        {g.skillId === 'NEEDS_YOU'
                          ? 'A moment with you'
                          : 'Skill group'}
                      </span>
                    </div>
                    <h3>{g.label}</h3>
                    <p>
                      {g.skillId === 'NEEDS_YOU'
                        ? 'A little time with you could make the difference.'
                        : g.skillId === 'ALL_MASTERED'
                          ? 'Keep ideas fresh with a little mixed practice.'
                          : 'One learning need. A small group you can teach together.'}
                    </p>
                    <div className="learner-chips">
                      {g.learners.map((l) => (
                        <button
                          onClick={() => {
                            void showLearner(l.id);
                          }}
                          key={l.id}
                        >
                          <Avatar id={l.id} />
                          <strong>{l.name}</strong>
                          <span className="grade-chip">C{l.grade}</span>
                          <span className="practice-next">
                            View progress <Icon name="arrow" />
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="group-foot">
                      {g.commonErrorTag ? (
                        <span>
                          Look for:{' '}
                          {g.commonErrorTag.toLowerCase().replaceAll('_', ' ')}
                        </span>
                      ) : (
                        <span>Ready for their next small step</span>
                      )}
                      <span aria-hidden="true">↗</span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="teacher-note">
                <Icon name="people" />
                <p>
                  <strong>Different grades. The same next step.</strong> Meena
                  in Class 4 and Kavya in Class 3 can practise borrowing
                  together. These are synthetic demo profiles.
                </p>
              </div>
            </>
          ) : null}
          {view === 'setup' && (
            <section className="setup-grid">
              <div className="panel">
                <h2>Connect to this classroom</h2>
                {setup ? (
                  <>
                    <img
                      className="qr"
                      alt="QR code containing this hub’s address"
                      src={setup.qrDataUrl}
                    />
                    <p>Manual entry works on every phone.</p>
                    {setup.addresses.map((address) => (
                      <p key={address}>
                        <a href={address}>{address}</a>
                      </p>
                    ))}
                  </>
                ) : (
                  <p>Loading connection details…</p>
                )}
              </div>
              <div className="panel">
                <h2>Ready to learn</h2>
                <h3>{setup?.pack.title}</h3>
                <p>
                  {size(setup?.pack.totalBytes ?? 0)} of pack assets · Kannada +
                  English
                </p>
                <p>
                  Kannada audio recordings pending. Text hints are included.
                </p>
                <h3>Devices seen</h3>
                {stats?.devices.map((d) => (
                  <p key={d.id}>
                    {d.label}{' '}
                    <span className="muted">
                      {d.lastSyncAt
                        ? new Date(d.lastSyncAt).toLocaleTimeString()
                        : ''}
                    </span>
                  </p>
                ))}
                <h3>Classroom roster</h3>
                <div className="roster-list">
                  {setup?.learners.map((l) => (
                    <button
                      className="text-button"
                      key={l.id}
                      onClick={() => {
                        void showLearner(l.id);
                      }}
                    >
                      <Avatar id={l.id} /> {l.name} · Class {l.grade}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
          {view === 'stats' && (
            <section className="panel stats-panel">
              <h2>Classroom traffic stays here.</h2>
              <div className="data-row">
                <span>LAN payload received</span>
                <strong>{size(stats?.lanIn ?? 0)}</strong>
              </div>
              <div className="data-row">
                <span>LAN payload sent</span>
                <strong>{size(stats?.lanOut ?? 0)}</strong>
              </div>
              <div className="data-row">
                <span>Gzipped cloud payload sent/attempted</span>
                <strong>{size(stats?.cloudBytes ?? 0)}</strong>
              </div>
              <div className="data-row">
                <span>Answers waiting for cloud</span>
                <strong>{stats?.pendingCloud ?? 0}</strong>
              </div>
              <div className="data-row">
                <span>Modeled monthly mobile data / student</span>
                <strong>
                  {stats?.projectedMbPerStudent.toFixed(3) ?? '—'} MB
                </strong>
              </div>
              <p>{stats?.projectionBasis}</p>
              <p>
                Internet reachability: not measured. LAN connectivity does not
                prove internet connectivity.
              </p>
              <div className="cloud-box">
                <div>
                  <h3>Cloud: simulated local receiver</h3>
                  <p>Start pnpm dev:cloud to receive progress locally.</p>
                </div>
                <button
                  className="primary"
                  disabled={updating}
                  onClick={() => {
                    void flush();
                  }}
                >
                  {updating ? 'Sending…' : 'Flush to cloud'}
                </button>
              </div>
              <a
                href="http://localhost:8787/coordinator"
                target="_blank"
                rel="noreferrer"
              >
                Open simulated coordinator view ↗
              </a>
            </section>
          )}
          {demo && (
            <section className="demo-controls">
              <strong>Demo controls</strong>
              <span>
                {stats?.dayMs === 60000
                  ? '1 minute = 1 learning day'
                  : 'Real-day intervals'}
              </span>
              <button
                className="outline"
                onClick={() => {
                  void advance();
                }}
              >
                Advance 1 day
              </button>
              <span>
                Seed fixtures: pnpm demo:seed · No real classroom data
              </span>
            </section>
          )}
          <footer className="teacher-footer">
            <span>Learning belongs everywhere.</span>
            <span>Offline first. Built with care by Klarity.</span>
          </footer>
        </main>
      </div>
      {detail && (
        <LearnerDialog onClose={() => setDetail(undefined)}>
          <section
            className="learner-detail panel"
            aria-label={`${detail.learner.name} learning progress`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button outline"
              autoFocus
              onClick={() => setDetail(undefined)}
            >
              Close ×
            </button>
            <Avatar id={detail.learner.id} className="detail-avatar" />
            <h2>{detail.learner.name}’s learning path</h2>
            <p>Class {detail.learner.grade} · Rebuilt from saved answers</p>
            {detail.states.map((s) => (
              <div className="mastery-row" key={s.skillId}>
                <div>
                  <strong>
                    {SKILLS.find((k) => k.id === s.skillId)?.name}
                  </strong>
                  <span>{Math.round(s.pL * 100)}%</span>
                </div>
                <div
                  className="mastery-track"
                  role="meter"
                  aria-label={s.skillId}
                  aria-valuenow={s.pL * 100}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${s.pL * 100}%` }} />
                  <i title="75% mastery line" />
                </div>
                <small>
                  {s.nextReviewAt
                    ? `Review ${new Date(s.nextReviewAt).toLocaleString()}`
                    : s.attempts
                      ? `${s.attempts} attempts · Learning`
                      : 'Not practised yet'}
                </small>
              </div>
            ))}
            <p className="muted">The vertical mark is the 75% mastery line.</p>
            <h3>Recent answers</h3>
            <div className="attempt-chips">
              {detail.attempts.slice(-12).map((a) => (
                <span
                  className={a.correct ? 'correct-chip' : 'wrong-chip'}
                  key={a.id}
                  title={a.errorTag ?? a.skillId}
                >
                  {a.correct ? '✓' : '×'} {a.chosen}
                </span>
              ))}
            </div>
            <p>
              {detail.attempts
                .filter((a) => a.errorTag)
                .slice(-3)
                .map((a) => a.errorTag?.toLowerCase().replaceAll('_', ' '))
                .join(' · ') || 'No misconception tags recorded.'}
            </p>
          </section>
        </LearnerDialog>
      )}
    </div>
  );
}
