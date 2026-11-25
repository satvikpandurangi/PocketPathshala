# Product requirements

## Scope and acceptance

1. First run: enter teacher address, fetch roster and verified content, then show “Pack saved offline”. Failed downloads preserve the previous ready pack. Accept only a complete, schema-valid pack with verified hashes.
2. Shared phone: choose a named avatar. Every attempt is keyed by learnerId and deviceId. Switching profiles must not mix histories. Device A and B query parameters select isolated browser databases for rehearsal.
3. Practice: one question, three ≥56px options, accessible feedback, explicit Continue. Wrong answers show an error-specific hint before a scaffold. Include the video questions exactly. A missing recording shows “Kannada recording pending”; never play fake audio.
4. Progress: children see skill stars; teachers see numeric mastery and a 75% line. Engine state comes from attempt replay, not editable percentages.
5. Hub: persist attempts in SQLite, acknowledge contiguous device sequences, group across grades, survive restart, and ignore identical repeated events. Reject inconsistent event identities.
6. Offline: installed app shell and saved pack continue after reload with hub unavailable. Browser service workers require localhost or HTTPS; plain HTTP LAN browsing is not an offline installation mechanism. Capacitor bundles the shell.
7. Teacher: groups refresh every five seconds, details show attempts and review dates, setup lists devices and LAN addresses, stats distinguish LAN payload bytes from gzipped cloud payload bytes.
8. Cloud: explicit simulated local receiver, persistent idempotent ingest, retryable outbox. No AWS claim until deployed and tested.

## Constraints and release gate

Android 9+, 2 GB RAM, 360×640 minimum layout. No runtime external resources. At least 60 maths items, five skills, targeted text hints for every error tag, ten human Kannada recordings required before an audio-complete pitch. Node ≥22.13 and pnpm workspace. Engine tests, restart/idempotency integration tests, browser walkthrough, and real phone checks are separate release gates. No time-based claim substitutes for evidence.

## Privacy and safety

Demo names are synthetic personas. LAN hub has no production authentication: use only a trusted classroom hotspot, never expose port 8080 publicly. A production pilot requires teacher authentication, retention controls, consent, and encrypted cloud transport. Profiles on a shared device are separate records, not confidential accounts. No real children’s identifying data in logs or commits.
