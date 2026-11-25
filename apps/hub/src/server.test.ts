import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { type Attempt } from '@pp/shared';
import { generateItems } from '@pp/engine';
import { createHub } from './server';
import { seedAttempts } from '../../../tools/demo/fixtures';
import { createCloud } from '../../cloud/src/server';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});
async function setup(demo = true) {
  const dir = await mkdtemp(resolve(tmpdir(), 'pp-test-'));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  const dbPath = resolve(dir, 'hub.db');
  const hub = await createHub({ dbPath, root, demo, now: () => 200000 });
  cleanup.push(() => hub.app.close());
  return { ...hub, dbPath, dir };
}
function attempt(
  deviceId: string,
  seq: number,
  extra: Partial<Attempt> = {},
): Attempt {
  const item = generateItems()[0],
    option = item.options.find((o) => o.correct)!;
  return {
    id: randomUUID(),
    deviceId,
    seq,
    learnerId: 'meena',
    itemId: item.id,
    skillId: item.skillId,
    packId: 'maths-c2-c5-v1',
    packVersion: 1,
    chosen: option.value,
    correct: true,
    errorTag: null,
    hintShown: false,
    responseMs: 1000,
    createdAt: 100000 + seq,
    ...extra,
  };
}
describe('persistent hub and sync', () => {
  it('two devices, hub restart and double resync retain a unique event set', async () => {
    const hub = await setup(),
      a = attempt('A', 1),
      b = attempt('B', 1, { learnerId: 'kavya' });
    for (const event of [a, b])
      expect(
        (
          await hub.app.inject({
            method: 'POST',
            url: '/api/sync',
            payload: { deviceId: event.deviceId, attempts: [event] },
          })
        ).statusCode,
      ).toBe(200);
    await hub.app.close();
    const restarted = await createHub({
      dbPath: hub.dbPath,
      root,
      demo: true,
      now: () => 200000,
    });
    cleanup.push(() => restarted.app.close());
    for (const event of [a, b, a, b])
      expect(
        (
          await restarted.app.inject({
            method: 'POST',
            url: '/api/sync',
            payload: { deviceId: event.deviceId, attempts: [event] },
          })
        ).json().ackSeq,
      ).toBe(1);
    expect(
      (await restarted.app.inject('/api/teacher/stats')).json().attemptCount,
    ).toBe(2);
  });
  it('acks only contiguous stored sequences and rejects UUID/sequence conflicts', async () => {
    const { app } = await setup(),
      a = attempt('A', 1),
      b = attempt('A', 2),
      c = attempt('A', 3);
    const send = (events: Attempt[]) =>
      app.inject({
        method: 'POST',
        url: '/api/sync',
        payload: { deviceId: 'A', attempts: events },
      });
    expect((await send([a, c])).json().ackSeq).toBe(1);
    expect((await send([b])).json().ackSeq).toBe(3);
    expect((await send([{ ...a, id: randomUUID() }])).statusCode).toBe(409);
    expect((await send([{ ...a, responseMs: 222 }])).statusCode).toBe(409);
  });
  it('rejects forged answers and invalid batch without partially storing events', async () => {
    const { app } = await setup(),
      a = attempt('A', 1),
      bad = attempt('A', 2, { correct: false });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/sync',
          payload: { deviceId: 'A', attempts: [a, bad] },
        })
      ).statusCode,
    ).toBe(400);
    expect((await app.inject('/api/teacher/stats')).json().attemptCount).toBe(
      0,
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/sync',
          payload: { deviceId: 'B', attempts: [a] },
        })
      ).statusCode,
    ).toBe(409);
  });
  it('preserves cross-grade borrowing groups from real replayed prerequisite events', async () => {
    const { app } = await setup(),
      events = seedAttempts(200000);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/sync',
          payload: { deviceId: 'seed', attempts: events },
        })
      ).statusCode,
    ).toBe(200);
    const group = (await app.inject('/api/teacher/groups'))
      .json()
      .groups.find((g: { skillId: string }) => g.skillId === 'SUB_BORROW');
    expect(group.learners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Meena', grade: 4 }),
        expect.objectContaining({ name: 'Kavya', grade: 3 }),
      ]),
    );
  });
  it('serves range requests, validators and gzip; counts LAN payloads', async () => {
    const { app } = await setup(),
      path = '/packs/maths-c2-c5-v1/1/items/items.json';
    const response = await app.inject({
      url: path,
      headers: { range: 'bytes=0-19' },
    });
    expect(response.statusCode).toBe(206);
    expect(response.rawPayload.length).toBe(20);
    expect(response.headers.etag).toBeTruthy();
    expect(
      (
        await app.inject({
          url: path,
          headers: { 'if-none-match': String(response.headers.etag) },
        })
      ).statusCode,
    ).toBe(304);
    const compressed = await app.inject({
      url: '/api/packs',
      headers: { 'accept-encoding': 'gzip' },
    });
    expect(compressed.headers['content-encoding']).toBe('gzip');
    expect(
      JSON.parse(gunzipSync(compressed.rawPayload).toString()),
    ).toHaveLength(1);
    expect(
      (await app.inject('/api/teacher/stats')).json().lanOut,
    ).toBeGreaterThan(20);
  });
  it('gates the demo clock and advances injected time', async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/teacher/clock',
      payload: { advanceDays: 1, dayMs: 60000 },
    });
    expect(response.json().time).toBe(260000);
    const locked = await setup(false);
    expect(
      (
        await locked.app.inject({
          method: 'POST',
          url: '/api/teacher/clock',
          payload: { advanceDays: 1 },
        })
      ).statusCode,
    ).toBe(403);
  });
  it('retains outbox on failure; flushes gzip into persistent idempotent cloud receiver', async () => {
    const { dir } = await setup();
    const cloud = await createCloud(resolve(dir, 'cloud.db'));
    await cloud.listen({ host: '127.0.0.1', port: 0 });
    cleanup.push(() => cloud.close());
    const address = cloud.server.address();
    if (!address || typeof address === 'string')
      throw new Error('No test receiver');
    const hub = await createHub({
      dbPath: resolve(dir, 'other.db'),
      root,
      cloudUrl: `http://127.0.0.1:${address.port}`,
    });
    cleanup.push(() => hub.app.close());
    const a = attempt('A', 1);
    await hub.app.inject({
      method: 'POST',
      url: '/api/sync',
      payload: { deviceId: 'A', attempts: [a] },
    });
    const sent = await hub.app.inject({
      method: 'POST',
      url: '/api/cloud/flush',
      payload: {},
    });
    expect(sent.statusCode).toBe(200);
    expect(sent.json().bytes).toBeGreaterThan(0);
    expect(sent.json().count).toBe(1);
    expect(
      (await hub.app.inject('/api/teacher/stats')).json().pendingCloud,
    ).toBe(0);
    expect(
      (await cloud.inject('/api/coordinator')).json().gaps[0].attempts,
    ).toBe(1);
    expect(
      (
        await hub.app.inject({
          method: 'POST',
          url: '/api/cloud/flush',
          payload: {},
        })
      ).json().count,
    ).toBe(0);
    await cloud.close();
    await hub.app.inject({
      method: 'POST',
      url: '/api/sync',
      payload: { deviceId: 'A', attempts: [attempt('A', 2)] },
    });
    expect(
      (
        await hub.app.inject({
          method: 'POST',
          url: '/api/cloud/flush',
          payload: {},
        })
      ).statusCode,
    ).toBe(503);
    expect(
      (await hub.app.inject('/api/teacher/stats')).json().pendingCloud,
    ).toBe(1);
  });
});
