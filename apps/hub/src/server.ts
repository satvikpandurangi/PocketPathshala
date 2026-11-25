import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import serveStatic from '@fastify/static';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { Readable, Transform } from 'node:stream';
import QRCode from 'qrcode';
import { z } from 'zod';
import {
  AttemptSchema,
  ClockRequestSchema,
  DeviceSchema,
  IngestAckSchema,
  PackSchema,
  SyncRequestSchema,
} from '@pp/shared';
import { groupLearners, replay } from '@pp/engine';
import {
  ConflictError,
  getAttempts,
  getKv,
  getLearners,
  initializeDatabase,
  insertBatch,
  setKv,
} from './db';

export type HubOptions = {
  dbPath: string;
  root: string;
  demo?: boolean;
  cloudUrl?: string;
  now?: () => number;
  port?: number;
};
export async function createHub(options: HubOptions) {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 });
  const db = new DatabaseSync(options.dbPath);
  initializeDatabase(db);
  const now = () => (options.now ?? Date.now)() + getKv(db, 'clockOffset', 0),
    dayMs = () => getKv(db, 'dayMs', 86400000);
  const directory = resolve(options.root, 'content/packs/maths-c2-c5-v1');
  const manifest = JSON.parse(
    readFileSync(resolve(directory, 'pack.json'), 'utf8'),
  );
  const pack = PackSchema.parse({
    manifest,
    items: JSON.parse(
      readFileSync(resolve(directory, manifest.itemsFile), 'utf8'),
    ),
    hints: JSON.parse(
      readFileSync(resolve(directory, manifest.hintsFile), 'utf8'),
    ),
  });
  db.prepare('INSERT OR REPLACE INTO packs VALUES (?,?)').run(
    pack.manifest.id,
    JSON.stringify(pack.manifest),
  );
  await app.register(cors, { origin: true });
  await app.register(compress, {
    global: true,
    encodings: ['gzip'],
    threshold: 256,
  });
  let lanIn = getKv(db, 'lanIn', 0),
    lanOut = getKv(db, 'lanOut', 0);
  app.addHook('onRequest', async (request) => {
    lanIn += Number(request.headers['content-length'] ?? 0);
  });
  app.addHook('onSend', async (_request, _reply, payload) => {
    if (typeof payload === 'string') lanOut += Buffer.byteLength(payload);
    else if (Buffer.isBuffer(payload)) lanOut += payload.length;
    // Static streams are counted as bytes actually consumed by the response.
    else if (payload instanceof Readable) {
      const meter = new Transform({
        transform(chunk: Buffer, _encoding, done) {
          lanOut += chunk.length;
          done(null, chunk);
        },
      });
      payload.on('error', (error) => meter.destroy(error));
      return payload.pipe(meter);
    }
    return payload;
  });
  app.addHook('onClose', async () => {
    setKv(db, 'lanIn', lanIn);
    setKv(db, 'lanOut', lanOut);
    db.close();
  });
  app.setErrorHandler((error, _request, reply) => {
    const httpError = error as Error & { statusCode?: number };
    const status =
      error instanceof z.ZodError
        ? 400
        : error instanceof ConflictError
          ? 409
          : (httpError.statusCode ?? 500);
    return reply.code(status).send({
      error:
        status < 500
          ? httpError.message
          : 'Hub could not complete the request; retry safely.',
    });
  });
  await app.register(serveStatic, {
    root: directory,
    prefix: `/packs/${pack.manifest.id}/${pack.manifest.version}/`,
    decorateReply: true,
  });
  const web = resolve(options.root, 'apps/app/dist');
  if (existsSync(web)) {
    await app.register(serveStatic, {
      root: web,
      prefix: '/',
      decorateReply: false,
    });
    app.get('/teacher', async (_req, reply) =>
      reply.sendFile('index.html', web),
    );
  }
  app.get('/api/health', async () => ({
    ok: true,
    hubId: 'klarity-hub',
    time: now(),
    version: '0.1.0',
  }));
  app.get('/api/roster', async () => getLearners(db));
  app.get('/api/packs', async () => [pack.manifest]);
  app.post('/api/sync', async (request) => {
    const body = SyncRequestSchema.parse(request.body);
    const roster = [...getLearners(db), ...(body.learnersCreated ?? [])];
    for (const a of body.attempts) {
      const item = pack.items.find((i) => i.id === a.itemId),
        option = item?.options.find((o) => o.value === a.chosen);
      if (
        !roster.some((l) => l.id === a.learnerId) ||
        a.packId !== pack.manifest.id ||
        a.packVersion !== pack.manifest.version ||
        !item ||
        item.skillId !== a.skillId ||
        !option ||
        option.correct !== a.correct ||
        (option.errorTag ?? null) !== a.errorTag
      )
        throw new z.ZodError([
          {
            code: 'custom',
            path: ['attempts'],
            message: 'Attempt does not match roster, pack, item or answer',
          },
        ]);
    }
    const ackSeq = insertBatch(
      db,
      body.deviceId,
      body.attempts,
      body.learnersCreated ?? [],
      now(),
    );
    // Classroom history lets a shared learner resume on another device. Local union stays immutable.
    return {
      ackSeq,
      rosterVersion: 1,
      packUpdates: [pack.manifest],
      serverTime: now(),
      history: getAttempts(db),
    };
  });
  app.get('/api/teacher/groups', async () => ({
    groups: groupLearners(getLearners(db), getAttempts(db), now(), {
      dayMs: dayMs(),
    }),
    time: now(),
  }));
  app.get<{ Params: { id: string } }>(
    '/api/teacher/learner/:id',
    async (request, reply) => {
      const learner = getLearners(db).find((l) => l.id === request.params.id);
      if (!learner) return reply.code(404).send({ error: 'Unknown learner' });
      const attempts = getAttempts(db).filter(
        (a) => a.learnerId === learner.id,
      );
      return {
        learner,
        states: replay(learner.id, attempts, { dayMs: dayMs() }),
        attempts,
      };
    },
  );
  app.get('/api/teacher/stats', async () => {
    const attempts = getAttempts(db),
      cloudBytes = getKv(db, 'cloudBytes', 0),
      roster = getLearners(db);
    const compressedPerAttempt = attempts.length
      ? gzipSync(JSON.stringify(attempts)).length / attempts.length
      : 150;
    return {
      devices: db
        .prepare('SELECT json FROM devices')
        .all()
        .map((r) => DeviceSchema.parse(JSON.parse(String(r.json)))),
      attemptCount: attempts.length,
      lanIn,
      lanOut,
      cloudBytes,
      pendingCloud: Number(
        db.prepare('SELECT COUNT(*) AS n FROM cloud_outbox').get()!.n,
      ),
      dayMs: dayMs(),
      time: now(),
      projectedMbPerStudent:
        (compressedPerAttempt * 400 +
          pack.manifest.totalBytes / Math.max(1, roster.length)) /
        1000000,
      projectionBasis:
        'Modeled: 20 days × 20 answers; observed gzip bytes/answer + one teacher pack shared across roster. Payload only; excludes retries/transport overhead. Not field-measured.',
    };
  });
  const addresses = [
    'http://localhost:' + String(options.port ?? 8080),
    ...Object.values(networkInterfaces()).flatMap((rows) =>
      (rows ?? [])
        .filter((r) => r.family === 'IPv4' && !r.internal)
        .map((r) => `http://${r.address}:${options.port ?? 8080}`),
    ),
  ];
  app.get('/api/teacher/setup', async () => ({
    addresses,
    qrDataUrl: await QRCode.toDataURL(addresses[1] ?? addresses[0]),
    pack: pack.manifest,
    learners: getLearners(db),
  }));
  app.post('/api/teacher/clock', async (request, reply) => {
    if (!options.demo)
      return reply
        .code(403)
        .send({ error: 'Start hub with DEMO=1 to use the demo clock' });
    const body = ClockRequestSchema.parse(request.body);
    if (body.dayMs) setKv(db, 'dayMs', body.dayMs);
    if (body.advanceDays)
      setKv(
        db,
        'clockOffset',
        getKv(db, 'clockOffset', 0) + body.advanceDays * dayMs(),
      );
    return { time: now(), dayMs: dayMs() };
  });
  let flushing = false;
  app.post('/api/cloud/flush', async (_request, reply) => {
    if (flushing)
      return reply
        .code(409)
        .send({ error: 'A cloud flush is already running' });
    const attempts = db
      .prepare(
        'SELECT a.json FROM attempts a JOIN cloud_outbox o ON o.attemptId=a.id',
      )
      .all()
      .map((r) => AttemptSchema.parse(JSON.parse(String(r.json))));
    if (!attempts.length) return { bytes: 0, count: 0, simulated: true };
    flushing = true;
    try {
      const body = gzipSync(
        JSON.stringify({ schoolId: 'klarity-demo', attempts }),
      );
      setKv(db, 'cloudBytes', getKv(db, 'cloudBytes', 0) + body.length);
      const response = await fetch(
        `${options.cloudUrl ?? 'http://127.0.0.1:8787'}/ingest`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-encoding': 'gzip',
          },
          body,
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) throw new Error('Cloud rejected request');
      const ack = IngestAckSchema.parse(await response.json());
      if (!attempts.every((a) => ack.acceptedIds.includes(a.id)))
        throw new Error('Incomplete cloud acknowledgement');
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const a of attempts)
          db.prepare('DELETE FROM cloud_outbox WHERE attemptId=?').run(a.id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return { bytes: body.length, count: attempts.length, simulated: true };
    } catch {
      return reply.code(503).send({
        error:
          'Local cloud simulator unavailable. Queue retained; start pnpm dev:cloud, then retry.',
      });
    } finally {
      flushing = false;
    }
  });
  return { app, db, addresses };
}
