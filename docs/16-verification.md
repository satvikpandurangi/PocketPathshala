# Verification — November 26, 2026 (IST)

## Automated evidence

Final source checks: 23 unit/integration tests and three browser scenarios pass. Strict type checking, ESLint, production workspace builds and Prettier check pass. Final debug APK build succeeds and contains the current web bundle.

- Engine: BKT mathematics/parameter validation; per-skill config; deterministic 90-item generation; distinct misconception distractors; exact video questions; 1/3/7 scheduling/reset; deterministic replay; scaffold/review/frontier priorities; cross-grade groups; Needs you rules; integer-millisecond review dates.
- Device store: concurrent sequences, learner partitioning, reopen persistence, history union, restored device sequence recovery.
- Hub: two-device sync; restart and retries; contiguous acks; identity conflicts; forged-answer rejection and atomic batches; groups; gzip, ETag and Range; gated clock; real gzip outbox transfer and queue retention.
- Cloud: restart persistence, repeated gzip ingest, immutable conflict rejection, HTML escaping and local font whitelist.
- Browser: exact Meena wrong-answer/hint/scaffold/correct flow; offline reload and continued saved practice; Meena C4 + Kavya C3 group and teacher detail; verified pack install; 360×640 overflow checks; separate devices; clock-driven review; sync dialog Escape/focus restoration.

Commands: pnpm test; pnpm typecheck; pnpm lint; pnpm build; pnpm test:browser; pnpm demo:bytes; pnpm format:check. Root build includes pnpm -r build. Seed was run twice without changing prior events. Browser tests use an isolated hub/database.

## Artifacts and measurements

- Complete image: docs/design/interface-system-v1.png. Built-in imagegen first, local SVG/CSS implementation second. See design/README.md for critique.
- Compressed web shell is approximately 200.6 KB including WOFF2 fonts, well below 1.5 MB. Exact bytes: dist/byte-report.json.
- Pack: 90 questions, ten text hints, one SVG, 41,282 asset bytes. Manifest excludes itself from that total. No audio files exist yet.
- Sample gzip envelope: 63 synthetic attempts, 2,478 bytes. Monthly model: approximately 0.019 MB/student for 400 attempts and one teacher pack split over twelve learners. Excludes APK, future recordings, retries and HTTP/TCP overhead. This is not a carrier-data or field measurement.
- Android assembleDebug succeeds using Java 21, SDK 36, min SDK 28. Approximately 9.5 MB debug-signed APK. Gradle plugin warns that its tested compile SDK is 35; compilation with installed SDK 36 succeeds. This needs toolchain follow-up, separate from device validation.
- Portable hub: dist/termux/hub.mjs and separate web/content directories. Node smoke check on port 8091 passed for health, teacher shell and pack metadata. This does not replace Termux testing.

## Remaining limits

adb lists no connected devices. No APK installation, Android runtime, real hotspot/Termux test, battery/doze check, real Kannada playback, AWS deployment or pilot measurement is claimed. Chrome offline emulation verifies application behavior; a live OS-network-disabled rehearsal remains recommended. No backup video was created.

Generated JSON is excluded from formatting to preserve pack hashes. Captured clock estimates and replayed review timestamps use integer milliseconds. The static service-worker cache ignores CORS Vary for same-origin hashed assets only; APIs and pack-download routes stay outside shell caching. The local cloud simulator uses port 8787; port 8081 belongs to the existing Codex runtime and is preserved.
