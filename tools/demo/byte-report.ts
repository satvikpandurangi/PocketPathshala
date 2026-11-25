import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { seedAttempts } from './fixtures';
import { PackManifestSchema } from '../../packages/shared/src/index';
const app = resolve('apps/app/dist');
const assets = await readdir(resolve(app, 'assets'));
const files = [
  'index.html',
  'sw.js',
  'manifest.webmanifest',
  'icon.svg',
  ...assets.map((a) => `assets/${a}`),
];
const measured = await Promise.all(
  files.map(async (path) => {
    const content = await readFile(resolve(app, path));
    return {
      path,
      raw: content.length,
      compressed: path.endsWith('.woff2')
        ? content.length
        : gzipSync(content).length,
    };
  }),
);
const manifest = PackManifestSchema.parse(
  JSON.parse(await readFile('content/packs/maths-c2-c5-v1/pack.json', 'utf8')),
);
const attempts = seedAttempts(1795602600000);
const cloud = gzipSync(JSON.stringify({ schoolId: 'klarity-demo', attempts }));
const result = {
  shellGzipBytes: measured.reduce((n, f) => n + f.compressed, 0),
  packAssetBytes: manifest.totalBytes,
  missingHumanAudioClips: 10,
  sampleAttempts: attempts.length,
  sampleGzipDeltaBytes: cloud.length,
  modeledMonthlyMbPerStudent:
    ((cloud.length / attempts.length) * 400 + manifest.totalBytes / 12) /
    1000000,
  assumptions:
    '20 practice days ×20 attempts; observed synthetic gzip ratio; one teacher pack shared by 12 demo learners; excludes install APK, future audio, retries and HTTP/TCP overhead. Not measured field usage.',
  files: measured,
};
if (result.shellGzipBytes > 1500000)
  throw new Error('Student shell exceeds 1.5 MB gzip budget');
await mkdir('dist', { recursive: true });
await writeFile('dist/byte-report.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
