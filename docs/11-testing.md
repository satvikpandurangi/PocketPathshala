# Verification strategy

Root pnpm test runs engine, shared, store and hub integration tests. pnpm typecheck checks all strict TypeScript, pnpm lint checks source, pnpm build validates content and builds each workspace app. pnpm -r test and pnpm -r build are pre-commit gates if a commit is requested. Each phase must report fresh output, not inferred success.

Engine cases: exact first correct posterior .55263158, wrong posterior .17741935; all generated distractors unique; video no-borrow tag; borrow-no-decrement distinct rule; pending scaffold before due review; due review before frontier; 1/3/7 scheduling and wrong reset; last ten avoidance; shuffled replay equivalence; duplicate UUID dedup; cross-grade Meena/Kavya grouping; same-error streak and inactivity bucket.

Hub cases: valid two-device sync; restart on same SQLite file; resubmit identical IDs → unchanged count; gap seq3 with seq2 missing → ack1; filling gap →ack3; conflict UUID or seq →409; malformed and forged outcome →400; one invalid event rolls back whole batch; roster references validated; gzip cloud acknowledgement clears only committed outbox; failed receiver leaves queue; static ranges and ETag; unknown endpoints and paths; demo gate.

Store cases: atomic seq across two append calls, learner partitioning, acknowledgement persistence, saved content survives reopening database. Browser walkthrough: connect, save pack, profile, wrong answer, hint, scaffold, correct, teacher refresh; 360px viewport; keyboard; offline reload on localhost; distinct device A/B histories. Bundle budget is actual gzip output excluding pack; payload accounting excludes transport overhead and must say so.

Manual gates: Android 9+ WebView, native HTTP cleartext, Termux node:sqlite availability, hotspot gateway, screen off/doze, restart, data-off transfer, real Kannada playback, low memory device, teacher review of Kannada and maths. Configuration-only work never passes these gates.
