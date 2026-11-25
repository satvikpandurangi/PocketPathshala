import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHub } from '../../apps/hub/src/server';
import { insertBatch } from '../../apps/hub/src/db';
import { seedAttempts } from './fixtures';
const dir = await mkdtemp(resolve(tmpdir(), 'pp-browser-'));
const hub = await createHub({
  root: process.cwd(),
  dbPath: resolve(dir, 'hub.db'),
  demo: true,
  port: 8090,
});
insertBatch(hub.db, 'seed', seedAttempts(Date.now()), [], Date.now());
await hub.app.listen({ host: '127.0.0.1', port: 8090 });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void hub.app
      .close()
      .then(() => rm(dir, { force: true, recursive: true }))
      .then(() => process.exit(0));
  });
