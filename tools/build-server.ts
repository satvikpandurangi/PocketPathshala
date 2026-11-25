import { build } from 'esbuild';
const name = process.argv[2];
if (name !== 'hub' && name !== 'cloud')
  throw new Error('Expected hub or cloud');
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: 'dist/index.mjs',
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
console.log(`Built self-contained ${name} server.`);
