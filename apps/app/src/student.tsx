import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HealthSchema,
  PackManifestSchema,
  ROSTER,
  SKILLS,
  StatsSchema,
  type Attempt,
  type Learner,
  type Pack,
} from '@pp/shared';
import { replay, selectNext } from '@pp/engine';
import { api, installManifest, installPack, normalizeHub, sync } from './api';
import { StudentStore, deviceIdentifier } from './store';
import { Avatar, Icon, LearnerDialog, Regrouping } from './ui';

function LocalIllustration({
  store,
  path,
}: {
  store: StudentStore;
  path: string;
}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let cancelled = false,
      objectUrl = '';
    void store.assets.get(path).then((asset) => {
      if (asset && !cancelled) {
        objectUrl = URL.createObjectURL(asset.blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [store, path]);
  return url ? (
    <img
      className="local-illustration"
      src={url}
      alt="Example: three rods of ten and three single counters"
    />
  ) : null;
}

export function Brand() {
  return (
    <a className="brand" href="/">
      <span className="brand-icon">
        <Icon name="book" />
      </span>
      <span>
        Pocket
        <span className="brand-line">
          Pathshala<span className="brand-dot">.</span>
        </span>
      </span>
    </a>
  );
}
export function StudentApp() {
  const [deviceId] = useState(deviceIdentifier),
    [store] = useState(() => new StudentStore(deviceId));
  const [pack, setPack] = useState<Pack>(),
    [learners, setLearners] = useState<Learner[]>([]),
    [attempts, setAttempts] = useState<Attempt[]>([]),
    [learner, setLearner] = useState<Learner>();
  const [screen, setScreen] = useState<'home' | 'practice' | 'progress'>(
      'home',
    ),
    [hub, setHub] = useState('http://localhost:8080'),
    [hubInput, setHubInput] = useState('http://localhost:8080');
  const [status, setStatus] = useState('Starting your classroom…'),
    [reachable, setReachable] = useState(false),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [pending, setPending] = useState(0),
    [lastSync, setLastSync] = useState(0),
    [offset, setOffset] = useState(0),
    [dayMs, setDayMs] = useState(86400000),
    [tick, setTick] = useState(Date.now());
  const [answer, setAnswer] = useState<{
      correct: boolean;
      tag: string | null;
      chosen: string;
    }>(),
    [saving, setSaving] = useState(false),
    [showConnect, setShowConnect] = useState(false),
    [showSync, setShowSync] = useState(false);
  const syncLock = useRef(false),
    started = useRef(Date.now()),
    audio = useRef<HTMLAudioElement | null>(null);
  const refresh = useCallback(async () => {
    setLearners(await store.learners.toArray());
    setAttempts(await store.attempts.toArray());
    const ack = await store.getSetting('ack', 0);
    setPending(
      (
        await store.attempts.where('deviceId').equals(deviceId).toArray()
      ).filter((a) => a.seq > ack).length,
    );
    setLastSync(await store.getSetting('lastSync', 0));
    setOffset(await store.getSetting('offset', 0));
  }, [store, deviceId]);
  const syncNow = useCallback(
    async (base = hub) => {
      if (syncLock.current) return;
      syncLock.current = true;
      try {
        await sync(store, base, deviceId);
        setReachable(true);
        setStatus('Your answers are safe with your teacher.');
        await refresh();
        const stats = await api(base, '/api/teacher/stats', StatsSchema);
        setDayMs(stats.dayMs);
      } catch {
        setReachable(false);
        setStatus(
          'Teacher is out of reach. Keep learning; your answers are saved here.',
        );
      } finally {
        syncLock.current = false;
      }
    },
    [hub, store, deviceId, refresh],
  );
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const savedHub = await store.getSetting('hub', location.origin);
        if (cancelled) return;
        setHub(savedHub);
        setHubInput(savedHub);
        const existing = await store.packs.get('maths-c2-c5-v1');
        if (existing) {
          setPack(existing);
          setStatus('Pack saved offline. You’re ready to learn.');
        } else {
          const manifest = await api(
            '',
            '/packs/maths-c2-c5-v1/1/pack.json',
            PackManifestSchema,
          );
          await installManifest(store, '', manifest, setProgress);
          setPack(await store.packs.get(manifest.id));
          setStatus(
            'Included practice pack saved offline. Connect to teacher to share progress.',
          );
        }
        if ((await store.learners.count()) === 0)
          await store.learners.bulkPut(ROSTER);
        await refresh();
        await syncNow(savedHub);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : 'Cannot open device storage. Enable site storage and retry.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // Initialization uses the stored address, not each user edit.
  }, [store]);
  useEffect(() => {
    const timer = setInterval(() => {
      void syncNow();
    }, 20000);
    return () => clearInterval(timer);
  }, [syncNow]);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    started.current = Date.now();
  }, [learner, attempts.length]);
  useEffect(
    () => () => {
      audio.current?.pause();
    },
    [],
  );
  const states = useMemo(
    () => (learner ? replay(learner.id, attempts, { dayMs }) : []),
    [learner, attempts, dayMs],
  );
  const selection = useMemo(
    () =>
      learner && pack
        ? selectNext(learner.id, attempts, pack.items, tick + offset, { dayMs })
        : undefined,
    [learner, pack, attempts, tick, offset, dayMs],
  );
  // Freeze the visible question until Continue, even if a background sync changes history.
  const [activeItem, setActiveItem] = useState<ReturnType<typeof selectNext>>();
  const chooseLearner = (value: Learner) => {
    setLearner(value);
    setAnswer(undefined);
    setScreen('practice');
    if (pack)
      setActiveItem(
        selectNext(value.id, attempts, pack.items, Date.now() + offset, {
          dayMs,
        }),
      );
  };
  const item = activeItem?.item ?? selection?.item;
  async function connect() {
    setBusy(true);
    setProgress(0);
    try {
      const base = normalizeHub(hubInput);
      await api(base, '/api/health', HealthSchema);
      setHub(base);
      await store.setSetting('hub', base);
      await installPack(store, base, setProgress);
      setPack(await store.packs.get('maths-c2-c5-v1'));
      setStatus('Pack saved offline ✓');
      await refresh();
      await syncNow(base);
      setShowConnect(false);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Cannot connect. Check the teacher address.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(value: string) {
    if (!item || !learner || answer || saving) return;
    setSaving(true);
    try {
      const option = item.options.find((o) => o.value === value)!;
      await store.append({
        id: crypto.randomUUID(),
        learnerId: learner.id,
        deviceId,
        itemId: item.id,
        skillId: item.skillId,
        packId: pack!.manifest.id,
        packVersion: pack!.manifest.version,
        chosen: value,
        correct: option.correct,
        errorTag: option.errorTag ?? null,
        hintShown: !option.correct,
        responseMs: Math.min(86400000, Date.now() - started.current),
        createdAt: Date.now(),
        clockOffsetMs: offset,
      });
      setAnswer({
        correct: option.correct,
        tag: option.errorTag ?? null,
        chosen: value,
      });
      await refresh();
      void syncNow();
    } catch (error) {
      setStatus(
        `Answer not saved: ${error instanceof Error ? error.message : 'Storage is full'}. Try again.`,
      );
    } finally {
      setSaving(false);
    }
  }
  async function next() {
    audio.current?.pause();
    setAnswer(undefined);
    const all = await store.attempts.toArray();
    if (learner && pack)
      setActiveItem(
        selectNext(learner.id, all, pack.items, Date.now() + offset, { dayMs }),
      );
    started.current = Date.now();
  }
  const hint = pack?.hints.find((h) => h.errorTag === answer?.tag);
  async function playHint() {
    if (!hint?.audioRef || !pack) return;
    const asset = await store.assets.get(
      `${pack.manifest.id}/${pack.manifest.version}/${hint.audioRef}`,
    );
    if (!asset) {
      setStatus('Recording is not installed. Read the steps below.');
      return;
    }
    audio.current?.pause();
    const url = URL.createObjectURL(asset.blob);
    audio.current = new Audio(url);
    audio.current.onended = () => URL.revokeObjectURL(url);
    try {
      await audio.current.play();
    } catch {
      setStatus('Tap play again, or read the hint.');
      URL.revokeObjectURL(url);
    }
  }
  return (
    <div className="student-shell">
      <header className="topbar">
        <Brand />
        <div className="top-actions">
          <button
            className={`status-pill ${reachable ? 'connected' : ''}`}
            onClick={() => setShowSync(true)}
          >
            <span className="status-dot" />
            {reachable ? 'Teacher connected' : 'Learning offline'}
          </button>
          <a className="teacher-link" href="/teacher">
            Teacher space ↗
          </a>
        </div>
      </header>
      <main
        className={`student-main ${screen !== 'home' ? 'is-practising' : ''}`}
      >
        <div className="student-breadcrumb">
          <span>Our classroom</span>
          <span>Kannada + English</span>
        </div>
        {screen === 'home' ? (
          <>
            <section className="welcome">
              <div>
                <p className="hand-note">
                  ನಮ್ಮ ಪುಟ್ಟ ಪಾಠಶಾಲೆ · Our little classroom
                </p>
                <h1>
                  Your classroom,
                  <br />
                  anywhere.
                </h1>
                <p>
                  Pick your name. Let’s learn something new,
                  <br className="desktop-break" /> one small step at a time.
                </p>
                <button
                  className="text-button"
                  onClick={() => setShowConnect(!showConnect)}
                >
                  ⌁ Connect to teacher
                </button>
              </div>
              <div className="welcome-aside">
                <span className="welcome-book">
                  <Icon name="book" />
                </span>
                <strong>
                  A shared phone.
                  <br />A path of your own.
                </strong>
                <p>
                  90 small activities.
                  <br />
                  Always here, even offline.
                </p>
              </div>
            </section>
            <section className="profiles">
              <div className="section-heading">
                <h2>Who’s learning today?</h2>
                <span>A shared phone. Your own journey.</span>
              </div>
              <div className="avatar-grid">
                {learners.map((l) => (
                  <button
                    className="avatar-card"
                    key={l.id}
                    disabled={!pack}
                    onClick={() => chooseLearner(l)}
                  >
                    <Avatar id={l.id} className="avatar" />
                    <strong>{l.name}</strong>
                    <span>Class {l.grade}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="practice-nav">
              <button
                className="text-button"
                onClick={() => {
                  setScreen('home');
                  setAnswer(undefined);
                }}
              >
                <Icon name="back" />
                <span>Change learner</span>
              </button>
              <span className="practice-identity">
                <Avatar id={learner?.id ?? 'meena'} />
                <span>
                  <strong>{learner?.name}</strong>
                  <small>Class {learner?.grade}</small>
                </span>
              </span>
              <button
                className="text-button"
                onClick={() =>
                  setScreen(screen === 'progress' ? 'practice' : 'progress')
                }
              >
                {screen === 'progress' ? 'Back to practice' : 'My stars ☆'}
              </button>
            </div>
            {screen === 'progress' ? (
              <section className="progress-page">
                <h1>Look how you’re growing.</h1>
                <p>Every try is a step forward, {learner?.name}.</p>
                {states.map((s) => (
                  <div className="star-row" key={s.skillId}>
                    <span>{SKILLS.find((k) => k.id === s.skillId)?.name}</span>
                    <strong
                      aria-label={s.mastered ? 'Mastered' : 'Still learning'}
                    >
                      {s.mastered ? '★ ★ ★' : s.attempts ? '★ ☆ ☆' : '☆ ☆ ☆'}
                    </strong>
                  </div>
                ))}
              </section>
            ) : (
              <section className="practice-area">
                <div className="question-board">
                  <div className="question-meta">
                    <span>
                      {SKILLS.find((s) => s.id === item?.skillId)?.name}
                    </span>
                    <span>
                      {activeItem?.reason === 'review'
                        ? 'Time for a little review'
                        : activeItem?.reason === 'scaffold'
                          ? 'One small step together'
                          : 'You’ve got this'}
                    </span>
                  </div>
                  <h1
                    className={
                      !/^\d+ [−+×]/.test(item?.prompt ?? '')
                        ? 'word-problem'
                        : ''
                    }
                  >
                    {item?.prompt ?? 'Opening your question…'}
                  </h1>
                  {item?.imageRef && pack && (
                    <LocalIllustration
                      store={store}
                      path={`${pack.manifest.id}/${pack.manifest.version}/${item.imageRef}`}
                    />
                  )}
                  <span className="board-caption">
                    Take your time. Choose one answer.
                  </span>
                </div>
                <div className="answer-grid">
                  {item?.options.map((o) => (
                    <button
                      disabled={!!answer || saving}
                      className={`answer-tile ${answer?.chosen === o.value ? (answer.correct ? 'right' : 'wrong') : ''}`}
                      key={o.value}
                      onClick={() => {
                        void submit(o.value);
                      }}
                    >
                      {o.value}
                      {answer?.chosen === o.value && (
                        <span>{answer.correct ? '✓' : '×'}</span>
                      )}
                    </button>
                  ))}
                </div>
                {answer && (
                  <div
                    className={`feedback ${answer.correct ? 'success' : 'retry'}`}
                    aria-live="polite"
                  >
                    <h2>
                      {answer.correct
                        ? '✓ That’s it. Well done!'
                        : 'Let’s try it together.'}
                    </h2>
                    {!answer.correct && hint && (
                      <>
                        <h3>{hint.title}</h3>
                        {answer.tag === 'SUB_NO_BORROW' && (
                          <>
                            <p className="worked-example">
                              Worked example · 52 − 27
                            </p>
                            <Regrouping />
                          </>
                        )}
                        <div className="hint-steps">
                          {hint.steps.map((step, index) => (
                            <p lang={index === 0 ? 'kn' : 'en'} key={step}>
                              {step}
                            </p>
                          ))}
                        </div>
                        {hint.audioRef ? (
                          <button
                            className="audio-button"
                            onClick={() => {
                              void playHint();
                            }}
                          >
                            ▶ Listen in Kannada{' '}
                            <span aria-hidden="true">▂▅▃▇▃▅▂</span>
                          </button>
                        ) : (
                          <p className="missing-audio">
                            ♫ Kannada recording pending · Read the steps
                            together.
                          </p>
                        )}
                      </>
                    )}
                    <button
                      className="primary"
                      onClick={() => {
                        void next();
                      }}
                    >
                      {answer.correct ? 'Next question' : 'Try a smaller step'}{' '}
                      →
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
        {showConnect && (
          <section className="connect-panel">
            <h2>Connect to teacher</h2>
            <p>
              Join your teacher’s Wi-Fi hotspot, then enter the address they
              show you.
            </p>
            <label htmlFor="hub-address">Teacher address</label>
            <div className="connect-fields">
              <input
                id="hub-address"
                value={hubInput}
                onChange={(e) => setHubInput(e.target.value)}
                placeholder="http://192.168.43.1:8080"
              />
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  void connect();
                }}
              >
                {busy ? 'Saving pack…' : 'Connect & save pack'}
              </button>
            </div>
            {busy && (
              <progress aria-label="Pack download" max={1} value={progress} />
            )}
            <p>
              Common hotspot address: 192.168.43.1:8080. Your teacher’s address
              may differ.
            </p>
          </section>
        )}
        <aside className="offline-strip">
          <span className="offline-symbol">
            <Icon name="download" />
          </span>
          <div>
            <strong>
              {pack
                ? 'Your classroom fits in your pocket.'
                : 'Getting your classroom ready…'}
            </strong>
            <p role="status">{status}</p>
          </div>
          <button
            className="outline"
            onClick={() => {
              void syncNow();
            }}
          >
            Sync now{pending > 0 ? ` (${pending})` : ''}
          </button>
        </aside>
        <div className="storage-note">
          <span>
            {pack
              ? `${pack.items.length} activities saved on this device`
              : 'Saving practice pack…'}
          </span>
          <span>
            {lastSync
              ? `Last synced ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'No teacher sync yet'}{' '}
            · Device {deviceId.slice(0, 8)}
          </span>
        </div>
      </main>
      {showSync && (
        <LearnerDialog onClose={() => setShowSync(false)}>
          <section className="sync-sheet panel">
            <button
              className="close-button outline"
              onClick={() => setShowSync(false)}
            >
              Close ×
            </button>
            <Icon name="cloud" className="sheet-cloud" />
            <h2>Your answers stay safe.</h2>
            <p>
              Keep learning on this device. Your answers will reach your teacher
              when the classroom network is ready.
            </p>
            <div className="data-row">
              <span>Pending answers</span>
              <strong>{pending}</strong>
            </div>
            <div className="data-row">
              <span>Last synced</span>
              <strong>
                {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Not yet'}
              </strong>
            </div>
            <p role="status">{status}</p>
            <button
              className="primary"
              onClick={() => {
                void syncNow();
              }}
            >
              <Icon name="refresh" />
              Sync now
            </button>
          </section>
        </LearnerDialog>
      )}
      <footer className="footer">
        <span>Learning belongs everywhere.</span>
        <span>
          Built with care by Klarity <Icon name="leaf" />
        </span>
      </footer>
    </div>
  );
}
