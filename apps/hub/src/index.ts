import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import QRCode from 'qrcode';
import { existsSync } from 'node:fs';
import { createHub } from './server';
const moduleDir = fileURLToPath(new URL('.', import.meta.url));
const root =
  process.env.PP_ROOT ??
  (existsSync(resolve(moduleDir, 'content'))
    ? moduleDir
    : fileURLToPath(new URL('../../../', import.meta.url)));
await mkdir(resolve(root, 'data'), { recursive: true });
const hub = await createHub({
  root,
  dbPath: process.env.HUB_DB ?? resolve(root, 'data/hub.db'),
  demo: process.env.DEMO === '1',
  cloudUrl: process.env.CLOUD_URL,
  port: Number(process.env.PORT ?? 8080),
});
await hub.app.listen({
  host: '0.0.0.0',
  port: Number(process.env.PORT ?? 8080),
});
console.log(
  'Pocket Pathshala • trusted LAN demo only\n' +
    hub.addresses.join('\n') +
    '\nTeacher: /teacher' +
    (process.env.DEMO === '1' ? '?demo=1' : ''),
);
console.log(
  await QRCode.toString(hub.addresses[1] ?? hub.addresses[0], {
    type: 'terminal',
    small: true,
  }),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void hub.app.close().then(() => process.exit(0));
  });
