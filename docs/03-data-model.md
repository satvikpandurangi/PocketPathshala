# Data model

Runtime schemas live in packages/shared/src/index.ts. Network payloads are parsed before persistence. IDs are bounded strings, attempts use UUIDs, counters are nonnegative integers, timestamps are epoch milliseconds, and probabilities lie in [0,1].

| Entity       | Fields and invariants                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learner      | id, name, avatar, grade (1–5), classroomId, createdAt                                                                                                                     |
| Device       | id, label, lastSyncAt optional; one monotonic sequence across all its learners                                                                                            |
| Skill        | id enum PV2/ADD_CARRY/SUB_BORROW/MUL_FACTS/DIV_SHARE, name, nameKn optional, grade, prereqs, order                                                                        |
| Item         | id, skillId, difficulty 1–3, prompt, promptKn optional, exactly 3 distinct options; one correct; distractors tagged; imageRef/audioRef optional                           |
| Hint         | errorTag, title, steps, optional audioRef, scaffoldSkill                                                                                                                  |
| Attempt      | UUID id, learnerId, deviceId, itemId, skillId, packId/version, chosen, correct, nullable errorTag, hintShown, responseMs, createdAt, seq; optional captured clockOffsetMs |
| SkillState   | learnerId, skillId, pL, mastered, attempts, reviewStage 0–3, optional nextReviewAt and lastErrorTag                                                                       |
| PackManifest | id, version, title, language kn/hi/te/en, skills, itemsFile, hintsFile, assets(path/bytes/sha256), totalBytes, createdAt                                                  |
| SyncCursor   | deviceId, lastAckSeq                                                                                                                                                      |

Hub tables: learners(id PK, json), devices(id PK, json), attempts(id PK, deviceId, seq, json, receivedAt, UNIQUE(deviceId,seq)), packs, cloud_outbox(attemptId PK), kv(key PK,json). Attempts and outbox insertion share a SQLite transaction. ReceivedAt is for transport diagnostics; learning timestamps retain the captured offset. Every accepted event must reference a known roster entry, installed pack/version, valid item/skill and actual option. The hub verifies the submitted outcome against the pack.

Device tables: learners, attempts (id PK, unique deviceId+seq), skillStates cache, packs, assets, settings. Allocate seq and append in a single readwrite transaction. Sync marks acknowledgement only after a valid successful response; events remain on the device. No destructive demo reset in the first release. Delete only an explicitly chosen demo database after backing up if needed.
