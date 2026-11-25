# Pocket Pathshala

Offline adaptive maths for a shared classroom phone. Team Klarity · wHACKiest 2026 · UnlockED Track 4.

## Run the laptop demo

Requires Node ≥22.13 and pnpm 11.20.0. From this directory:

```powershell
pnpm install
pnpm build
pnpm demo:seed
$env:DEMO='1'
pnpm dev
```

Open [student A](http://localhost:8080/?device=A), [student B](http://localhost:8080/?device=B), and [teacher](http://localhost:8080/teacher?demo=1). Select Meena, answer 35 to 52 − 27, read the borrowing hint, then answer 25 to 43 − 18. Sync, then inspect Meena and Kavya together in the borrowing group. Seeded prerequisite history is synthetic and clearly identified as device `seed`.

In another terminal run `pnpm dev:cloud`. Teacher → Data & sync → Flush to cloud sends real gzipped events to a **local simulator**. [Coordinator](http://localhost:8787/coordinator) is a local synthetic-data view. AWS is not deployed.

## Development and checks

`pnpm dev` serves the built web app and API at port 8080. After UI changes use `pnpm build`, or run `pnpm dev:app` for Vite at port 5173 with API proxy. `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm build` verify the implementation. `pnpm pack:build` regenerates content. `pnpm demo:simulate` sends deterministic synthetic prerequisite attempts to a running hub. `pnpm hub:bundle` creates a portable Node hub + web assets + pack in dist/termux.

Data persists in data/hub.db and data/cloud.db. Browser stores are per `?device=…`, otherwise a generated persistent device ID. No reset command silently deletes learning data. Rerunning seed is idempotent; run it before a demo on a fresh classroom. Config: DEMO=1 enables clock mutation, HUB_DB changes DB path, PP_ROOT changes project/distribution root, PORT changes hub port, CLOUD_URL selects a receiver (default http://127.0.0.1:8787).

## Honest demo limits

- Kannada text hints exist; human audio recordings are still required. Missing recordings are visibly labeled. No runtime TTS.
- Student storage is IndexedDB; hub/cloud storage is SQLite. Native student SQLite is deferred.
- Browser offline reload works only with a service worker on localhost or HTTPS. A plain HTTP LAN browser is not an installed offline Android app.
- Native Capacitor project and debug APK build are complete. Android 9+ runtime, Termux and real hotspot testing still require physical devices. See [Android setup](docs/13-android-hotspot-setup.md).
- Cloud is simulated locally. Counters measure payload bytes; monthly usage is a labeled model, not field evidence.
- Trusted LAN prototype, without production authentication. Do not expose publicly or enter real children’s identifying data.

See [build plan](docs/10-build-plan.md), [pitch alignment](docs/12-pitch-alignment.md), [demo script](docs/09-demo-script.md), and [decision log](docs/DECISIONS.md). The five-school, eight-week pilot is proposed only.

## Design and build artifacts

The complete [image-first interface design](docs/design/interface-system-v1.png) preceded UI refinement. Local SVG portraits/icons, large mobile answers, a regrouping diagram, learner rows and accessible dialogs implement the reference. See [design direction](docs/15-design-direction.md) and [verification](docs/16-verification.md).

`pnpm test:browser` runs three isolated Chrome scenarios, including browser offline mode. Chrome must be installed. `pnpm demo:bytes` writes dist/byte-report.json and checks the shell budget. Generated content JSON must not be formatted after hashing; pnpm pack:build regenerates it safely.

Debug APK: apps/app/android/app/build/outputs/apk/debug/app-debug.apk. To rebuild: pnpm build, pnpm --filter @pp/app android:sync, then run .\gradlew.bat assembleDebug from apps/app/android (./gradlew on Linux). Build success does not prove physical-device behavior.
