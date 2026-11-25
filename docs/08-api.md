# API contract

JSON requests/responses validated by shared Zod schemas; payload limit 1 MB. API errors use {error:string}. No secrets or real learner PII in error logs. Trusted LAN prototype only; add teacher auth before pilot. POST teacher operations need explicit demo enablement for mutation.

| Method and route             | Contract                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| GET /api/health              | {ok:true, hubId, time, version}; time uses demo clock when enabled                                                |
| GET /api/roster              | Learner[]                                                                                                         |
| GET /api/packs               | PackManifest[] including asset hashes                                                                             |
| GET /packs/:id/:version/*    | static file, ETag, Range; unknown paths 404; no traversal                                                         |
| POST /api/sync               | {deviceId,attempts,learnersCreated?} → {ackSeq,rosterVersion,packUpdates,serverTime}; 400 malformed, 409 conflict |
| GET /api/teacher/groups      | {groups:[{skillId,label,learners,commonErrorTag?}],time}                                                          |
| GET /api/teacher/learner/:id | {learner,states,attempts}; 404 unknown                                                                            |
| GET /api/teacher/stats       | devices, attemptCount, lanIn, lanOut, cloudBytes, pendingCloud, dayMs, time, modeled monthly usage                |
| GET /api/teacher/setup       | {addresses,qrDataUrl,pack,learners}                                                                               |
| POST /api/teacher/clock      | {advanceDays?:number,dayMs?:number}; DEMO=1 required; rejects invalid bounds                                      |
| POST /api/cloud/flush        | attempts to configured CLOUD_URL/ingest; returns bytes, count, simulated:true; 503 receiver unavailable           |
| POST /ingest (cloud)         | gzip {schoolId,attempts} → {acceptedIds,simulated:true}; persistent union by id                                   |
| GET /coordinator (cloud)     | HTML school/skill table derived from ingested events, clearly simulated                                           |

Teacher dashboard polling: 5 s. Device sync: 20 s plus manual/action triggers. Validate roster, manifests, items, hints, sync response, stats and detail data on the client. Native HTTP uses the same parsed contracts. CORS must allow the app origin on trusted LAN without credentials; this is not authentication. Hub binds 0.0.0.0:8080; cloud simulator defaults loopback:8787. Server errors must not delete queued attempts.
