# Four-minute rehearsal

Use synthetic learner data only. Run pnpm install, pnpm build, pnpm demo:seed, then set DEMO=1 and run pnpm dev. Optional simulator: pnpm dev:cloud in a second terminal. Open localhost:8080/?device=A, /?device=B and /teacher?demo=1. Browser tabs using different device queries have separate IndexedDB databases. Two windows alone do not create distinct physical devices.

1. Show teacher groups and cloud simulated label. Show OS Wi-Fi/Ethernet disabled. Hub localhost remains available. Internet is not inferred from a green LAN status indicator.
2. Student Connect & save pack downloads from the hub. Show saved status, LAN bytes and zero cloud bytes. If hub is unavailable, use bundled pack but say it was installed earlier; do not claim a live transfer.
3. Select Meena. Seed command provides real prerequisite attempts and device sync returns that history. Choose 35 for 52−27. Show targeted borrowing hint; explain that audio is pending unless actual recordings have been supplied. Continue to 43−18; choose 25. Show progress, sync.
4. In B choose Kavya, repeat borrowing mistake. Show learner grade chips together under subtraction on the teacher screen. For Imran inspect seeded progress toward division; simulated data is explicitly described as rehearsal data.
5. Advance clock one day in demo controls. Return to student and sync to refresh offset, then Continue; due reviews take priority after any pending scaffold. If no mastery exists, use the seeded mastered skill and explain its source.
6. Start local cloud simulator (internet is not needed for this). Flush to cloud, show compressed bytes and localhost:8787/coordinator. Say “This is the local cloud simulator; AWS is not deployed.” An internet toggle is only meaningful for a real remote receiver.
7. Show modeled monthly mobile usage with assumptions. Do not call it a measured 30-day result. Close with remaining phone/audio validation work.

Fallbacks: failed LAN → laptop localhost; browser not installable on plain HTTP → Capacitor or localhost; missing audio → visible text and honest pending label; receiver down → retain queue and show retry message; stale groups → manual refresh and pending sync count. Never reset during a live demo without preserving data. Backup recording and two full rehearsals remain human release tasks; no recording is claimed as created.
