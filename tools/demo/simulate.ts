import { seedAttempts } from './fixtures';
import { SyncResponseSchema } from '../../packages/shared/src/index';
const base = process.env.HUB_URL ?? 'http://localhost:8080';
const prior = await fetch(`${base}/api/sync`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ deviceId: 'seed', attempts: [] }),
});
if (!prior.ok) throw new Error('Cannot read simulator history');
const history = SyncResponseSchema.parse(await prior.json()).history.filter(
  (a) => a.deviceId === 'seed',
);
const events = history.length ? history : seedAttempts(Date.now());
const response = await fetch(`${base}/api/sync`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ deviceId: 'seed', attempts: events }),
});
if (!response.ok)
  throw new Error(
    `Hub rejected synthetic data: ${response.status} ${await response.text()}`,
  );
console.log(
  SyncResponseSchema.parse(await response.json()).ackSeq,
  'synthetic fixture attempts acknowledged. This is rehearsal data, not pilot evidence.',
);
