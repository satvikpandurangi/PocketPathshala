# Architecture

```text
React student / Capacitor → Dexie immutable log + ready packs
           │ LAN HTTP: roster / pack / sync
           ▼
Fastify hub :8080 → node:sqlite → shared replay → teacher React /teacher
           │ optional gzip outbox flush
           ▼
Local cloud simulator :8787 → SQLite → coordinator summary
```

packages/shared owns Zod contracts and seeded roster; packages/engine owns pure BKT, generation, replay, selection and grouping. One React app selects teacher mode from pathname. Vite output is served by the hub. All runtimes use the same engine, preventing algorithm drift.

Student persistence is Dexie/IndexedDB behind LocalStore. Native device SQLite remains an extension; the SQLite pitch applies to hub persistence only. Hub node:sqlite avoids native npm compilation. A distributable hub bundles TypeScript and libraries with esbuild, plus separate app and pack directories; built-in Node modules remain external. Termux compatibility needs a real-device test.

Attempt state is a grow-only set. Replay orders normalized timestamps, deviceId, seq, then id. State caches are disposable. Clock offset is captured per event at write time; changing a later device offset must not reorder old events. Demo time uses an injected clock and configurable DAY_MS. Real clocks never enter engine functions.

Browser offline shell uses a versioned service worker with local assets only. API responses are not blindly cached. Pack installation is staged, schema/hash checked, then atomically made ready in IndexedDB. Assets are persisted as Blob records. Cleartext Android LAN transport is scoped to the classroom trust boundary; see 13. See DECISIONS.md for deviations and limits.
