import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createCloud } from './server';
import { seedAttempts } from '../../../tools/demo/fixtures';
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
it('persists gzip ingest through restart and unions repeated events', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'pp-cloud-'));
  cleanups.push(() => rm(dir, { recursive: true, force: true }));
  const path = resolve(dir, 'cloud.db');
  let app = await createCloud(path);
  cleanups.push(() => app.close());
  const a = seedAttempts(200000)[0],
    payload = gzipSync(
      JSON.stringify({ schoolId: 'klarity-demo', attempts: [a] }),
    );
  const send = () =>
    app.inject({
      method: 'POST',
      url: '/ingest',
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
      },
      payload,
    });
  expect((await send()).json().acceptedIds).toEqual([a.id]);
  await app.close();
  app = await createCloud(path);
  expect((await send()).statusCode).toBe(200);
  expect((await app.inject('/api/coordinator')).json().gaps[0].attempts).toBe(
    1,
  );
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/ingest',
        payload: {
          schoolId: 'klarity-demo',
          attempts: [{ ...a, responseMs: 8 }],
        },
      })
    ).statusCode,
  ).toBe(400);
});
it('escapes classroom labels in coordinator and serves only bundled font names', async () => {
  const app = await createCloud(':memory:');
  cleanups.push(() => app.close());
  await app.inject({
    method: 'POST',
    url: '/ingest',
    payload: {
      schoolId: '<script>alert(1)</script>',
      attempts: seedAttempts(200000).slice(0, 1),
    },
  });
  const page = (await app.inject('/coordinator')).body;
  expect(page).toContain('Local cloud simulator');
  expect(page).toContain('&lt;script&gt;');
  expect(page).not.toContain('<script>alert(1)</script>');
  expect(
    (await app.inject('/fonts/dm-sans-latin-400-normal.woff2')).headers[
      'content-type'
    ],
  ).toBe('font/woff2');
  expect((await app.inject('/fonts/not-a-font.woff2')).statusCode).toBe(404);
});
