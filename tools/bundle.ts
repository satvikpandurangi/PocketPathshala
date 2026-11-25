import { build } from 'esbuild';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const target = resolve('dist/termux');
await mkdir(target, { recursive: true });
await build({
  entryPoints: ['apps/hub/src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: resolve(target, 'hub.mjs'),
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
await cp('apps/app/dist', resolve(target, 'apps/app/dist'), {
  recursive: true,
});
await cp('content', resolve(target, 'content'), { recursive: true });
await writeFile(
  resolve(target, 'start.sh'),
  '#!/bin/sh\ncd "$(dirname "$0")"\nexport PP_ROOT="$PWD"\nexec node hub.mjs\n',
);
console.log(
  'Hub distribution: dist/termux. Run sh start.sh (Node >=22.13). Actual Termux device verification pending.',
);
