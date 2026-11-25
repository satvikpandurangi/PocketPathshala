# Decision log

## ADR-001 — Shared deterministic engine

Accepted: strict pure TypeScript shared by app and hub. Clock passed explicitly. State derives from sorted immutable attempts. Reason: no server/client mastery drift; replay is testable.

## ADR-002 — Persistence

Accepted: Dexie/IndexedDB student LocalStore first; native SQLite adapter deferred. Hub/cloud use node:sqlite with transactions. SQLite claim is limited to the hub/cloud. Reason: browser and WebView portability without a native compiler.

## ADR-003 — Grow-only sync

Accepted: UUID event set plus unique per-device sequences, contiguous acknowledgements and conflict checks. Captured per-event clock offsets avoid changing historical order. Events retained locally after sync.

## ADR-004 — Offline distribution

Accepted: bundled app/pack plus atomic hashed installation from hub. Service worker only guarantees browser offline on localhost/HTTPS; Capacitor is phone path. Server Range support precedes client byte-range resume, which remains deferred.

## ADR-005 — Honest audio and cloud

Accepted: human Kannada recordings only, missing assets explicitly labeled. Local cloud receiver visibly simulated; no AWS deployed. No empty audio files or runtime TTS.

## ADR-006 — Demo and security boundary

Accepted: trusted-LAN prototype, DEMO=1 gates clock changes. No production authentication claimed. Exposing server to public networks is out of scope. No automatic commits or deployment; user requested files and implementation.

## ADR-007 — Visual direction

Accepted: brief palette and local Archivo Black/DM Sans; navy arithmetic board, avatar grid, grade chips and actionable groups. Large touch targets, explicit next step and screen-reader feedback. Avoid decorative data visualizations that imply unmeasured impact.

## ADR-008 — Image-first UI refinement

Accepted following user direction: generated complete interface board before refining the UI. Use consistent local SVG portraits/icons, learner rows, stacked mobile answers, regrouping diagram, and native focus-managed dialogs. The image is a design reference, not evidence of implemented features. No heavy UI library or runtime image dependency.

## ADR-009 — Simulator port and offline cache variants

Local cloud simulator uses 8787 because 8081 is occupied by the Codex runtime. Preserve the existing process. Service-worker matching of same-origin hashed static assets ignores Vary so the CORS Origin variation between precache requests and browser module/style requests does not break offline loading. API and pack requests remain outside shell caching.

## ADR-010 — Demo startup

DEMO=1 authorizes clock mutation but does not accelerate time on startup. Teacher's Advance 1 day explicitly sets 60000ms days. This prevents prerequisite review and inactivity from overtaking the intended borrowing demo while setting up windows.

## ADR-011 — Integer timestamp normalization

Accepted: round midpoint-derived clock offsets on the client and normalize replayed event times to integer milliseconds. This preserves older fractional offsets while keeping review dates valid under the shared timestamp contract. Regression test covers an odd-millisecond round trip.
