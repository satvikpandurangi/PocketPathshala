# Sync protocol

Base http://HOST:8080. Devices append, never edit. POST /api/sync sends deviceId, attempts after lastAckSeq, and optional learnersCreated. A batch is bounded (500 events). Hub validates all events, checks identity conflicts, inserts with idempotent semantics and records outbox entries atomically. Retry after network interruption sends the same UUIDs and seq values.

ackSeq is the highest contiguous stored sequence starting at 1 for this device. Receiving seq 3 before 2 cannot acknowledge 3. A repeated UUID with different content or a reused device sequence with another UUID returns 409; validation errors return 400. No partial batch is accepted. Response includes rosterVersion, packUpdates and serverTime. Device retains immutable events after acknowledgement.

Triggers: app open, every 20 seconds, manual Sync now, and completed practice actions. Requests have a timeout; failure changes hub reachability, not the ability to practise. One in-flight sync per device; retries never allocate replacement UUIDs. Browser device queries isolate storage for demo A/B; production IDs are random and persistent. Shared device tabs use transactional sequence allocation.

Clock estimate: health serverTime minus request midpoint; persist offset on future attempts. Normalize replay with the event’s captured offset. Demo clock advances affect due reviews, not rewriting old attempt timestamps. GET health after advancing teacher clock refreshes the student's estimate.

Pack installation: get manifests, download files under the listed pack version, verify SHA-256 and exact byte lengths, parse items/hints, write assets and ready pack together. Retry reuses already stored identical assets. HTTP static serving supports ETag and Range; partial-byte resume is a later optimization (do not claim it works merely because server Range works).

Cloud flush loads outbox, gzip encodes an envelope {schoolId, attempts}, POSTs only to configured receiver, and removes queued IDs only after a valid acknowledgement of every sent ID. Failure retains the outbox. The receiver unions by UUID and returns accepted IDs. Counters measure actual encoded payload bytes, excluding HTTP/TCP overhead; retransmissions count again. LAN totals count API and static payload transfers, distinct from mobile/cloud totals.

Implemented extension: responses include classroom history for cross-device learner resume. Device unions events and resumes its sequence above restored own-device history. This is a full LAN history pull, not a scalable paginated delta; cloud still sends outbox-only deltas. Midpoint offsets and review dates are rounded to integer milliseconds. Seed epoch is stored so rerunning seed does not mutate existing UUID events.
