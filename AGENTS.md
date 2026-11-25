# Pocket Pathshala engineering rules

Read docs/ before changing code. Update the relevant document when behavior changes and append design decisions to docs/DECISIONS.md. The source brief is a product specification, not evidence that features work.

- Use strict TypeScript; no any in packages/*. Validate network boundaries with Zod.
- Keep packages/engine pure: no I/O or Date.now(); inject time.
- Preserve immutable attempt events. Rebuild learning state by deterministic replay. Never silently discard unsynced data.
- Run pnpm -r test and pnpm -r build before a commit; do not commit failing checks. Also run root pnpm test and pnpm typecheck. Commit only when authorized by the user.
- Bundle fonts in apps/app/src/assets/fonts. No runtime CDNs, remote fonts, TTS, or internet requirement for practice.
- Student bundle budget: under 1.5 MB gzip excluding content. Record measured sizes.
- Conventional phase commits when requested. Preserve unrelated changes.
- Mark stubs in the UI and docs/12-pitch-alignment.md. Never present generated data as real classroom evidence.
- Prefer React, Vite, Dexie, Fastify, Zod, Vitest, esbuild, qrcode and Capacitor. Ask before a heavy dependency.
- Phone/Android/offline/audio claims require actual verification; a configuration file is not a completed device test.
