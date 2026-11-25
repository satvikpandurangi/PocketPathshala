import { DatabaseSync } from 'node:sqlite';
import {
  ROSTER,
  AttemptSchema,
  LearnerSchema,
  type Attempt,
  type Learner,
} from '@pp/shared';

export function initializeDatabase(db: DatabaseSync) {
  db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS learners(id TEXT PRIMARY KEY,json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,deviceId TEXT NOT NULL,seq INTEGER NOT NULL,json TEXT NOT NULL,receivedAt INTEGER NOT NULL,UNIQUE(deviceId,seq));
 CREATE TABLE IF NOT EXISTS packs(id TEXT PRIMARY KEY,json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS cloud_outbox(attemptId TEXT PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,json TEXT NOT NULL);`);
  const insert = db.prepare('INSERT OR IGNORE INTO learners VALUES (?,?)');
  for (const learner of ROSTER) insert.run(learner.id, JSON.stringify(learner));
}
export function getAttempts(db: DatabaseSync): Attempt[] {
  return db
    .prepare('SELECT json FROM attempts')
    .all()
    .map((row) => AttemptSchema.parse(JSON.parse(String(row.json))));
}
export function getLearners(db: DatabaseSync): Learner[] {
  return db
    .prepare('SELECT json FROM learners ORDER BY rowid')
    .all()
    .map((row) => LearnerSchema.parse(JSON.parse(String(row.json))));
}
export class ConflictError extends Error {}
function sameEvent(a: Attempt, b: Attempt) {
  return (
    (Object.keys(a) as (keyof Attempt)[]).every((key) => a[key] === b[key]) &&
    (Object.keys(b) as (keyof Attempt)[]).every((key) => a[key] === b[key])
  );
}
export function insertBatch(
  db: DatabaseSync,
  deviceId: string,
  attempts: Attempt[],
  learners: Learner[],
  now: number,
): number {
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const learner of learners) {
      const existing = db
        .prepare('SELECT json FROM learners WHERE id=?')
        .get(learner.id);
      if (existing && String(existing.json) !== JSON.stringify(learner))
        throw new ConflictError(
          'Learner already exists with different details',
        );
      db.prepare('INSERT OR IGNORE INTO learners VALUES (?,?)').run(
        learner.id,
        JSON.stringify(learner),
      );
    }
    for (const a of attempts) {
      if (a.deviceId !== deviceId)
        throw new ConflictError('Attempt device must match sync device');
      const existing = db
        .prepare(
          'SELECT json FROM attempts WHERE id=? OR (deviceId=? AND seq=?)',
        )
        .all(a.id, a.deviceId, a.seq);
      if (
        existing.some(
          (row) =>
            !sameEvent(AttemptSchema.parse(JSON.parse(String(row.json))), a),
        )
      )
        throw new ConflictError('UUID or device sequence conflict');
      if (!db.prepare('SELECT id FROM learners WHERE id=?').get(a.learnerId))
        throw new ConflictError('Unknown learner');
      const result = db
        .prepare('INSERT OR IGNORE INTO attempts VALUES (?,?,?,?,?)')
        .run(a.id, a.deviceId, a.seq, JSON.stringify(a), now);
      if (Number(result.changes) > 0)
        db.prepare('INSERT OR IGNORE INTO cloud_outbox VALUES (?)').run(a.id);
    }
    db.prepare('INSERT OR REPLACE INTO devices VALUES (?,?)').run(
      deviceId,
      JSON.stringify({ id: deviceId, label: deviceId, lastSyncAt: now }),
    );
    let ack = 0;
    for (const row of db
      .prepare('SELECT seq FROM attempts WHERE deviceId=? ORDER BY seq')
      .all(deviceId)) {
      if (Number(row.seq) === ack + 1) ack++;
      else break;
    }
    db.exec('COMMIT');
    return ack;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function getKv<T>(db: DatabaseSync, key: string, fallback: T): T {
  const row = db.prepare('SELECT json FROM kv WHERE key=?').get(key);
  return row ? (JSON.parse(String(row.json)) as T) : fallback;
}
export function setKv(db: DatabaseSync, key: string, value: unknown) {
  db.prepare('INSERT OR REPLACE INTO kv VALUES (?,?)').run(
    key,
    JSON.stringify(value),
  );
}
