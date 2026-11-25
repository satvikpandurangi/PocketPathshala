import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seedAttempts } from './fixtures';
import {
  getAttempts,
  getKv,
  setKv,
  initializeDatabase,
  insertBatch,
} from '../../apps/hub/src/db';
const dir = resolve('data');
await mkdir(dir, { recursive: true });
const db = new DatabaseSync(resolve(dir, 'hub.db'));
initializeDatabase(db);
const first = getAttempts(db)
  .filter((a) => a.deviceId === 'seed')
  .sort((a, b) => a.seq - b.seq)[0];
const epoch = getKv(
  db,
  'seedEpoch',
  first ? first.createdAt + 20000 - first.seq * 10 : Date.now(),
);
setKv(db, 'seedEpoch', epoch);
const events = seedAttempts(epoch);
insertBatch(db, 'seed', events, [], Date.now());
console.log(
  `Seeded ${events.length} synthetic prerequisite attempts without deleting existing data. Meena and Kavya are ready for borrowing. All fixture events are identifiable as device seed.`,
);
db.close();
