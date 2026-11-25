import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createCloud } from './server';
const root = fileURLToPath(new URL('../../../', import.meta.url));
await mkdir(resolve(root, 'data'), { recursive: true });
const app = await createCloud(resolve(root, 'data/cloud.db'));
await app.listen({ host: '127.0.0.1', port: 8787 });
console.log('Local cloud simulator: http://localhost:8787/coordinator');
