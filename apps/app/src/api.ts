import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { z } from 'zod';
import {
  HealthSchema,
  HintSchema,
  ItemSchema,
  LearnerSchema,
  PackManifestSchema,
  PackSchema,
  SyncResponseSchema,
  type PackManifest,
} from '@pp/shared';
import type { StudentStore } from './store';

export function normalizeHub(value: string) {
  const url = new URL(value.includes('://') ? value : `http://${value}`);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Use a teacher HTTP address without credentials');
  return url.origin;
}
export async function api<T>(
  base: string,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<T> {
  let value: unknown;
  if (Capacitor.isNativePlatform()) {
    const result = await CapacitorHttp.request({
      url: base + path,
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      connectTimeout: 5000,
      readTimeout: 8000,
    });
    if (result.status < 200 || result.status >= 300)
      throw new Error(
        typeof result.data?.error === 'string'
          ? result.data.error
          : `Teacher returned ${result.status}`,
      );
    value = result.data;
  } else {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: `Teacher returned ${response.status}` }));
      throw new Error(String(error.error));
    }
    value = await response.json();
  }
  return schema.parse(value);
}
export async function sync(
  store: StudentStore,
  base: string,
  deviceId: string,
) {
  const start = Date.now(),
    health = await api(base, '/api/health', HealthSchema),
    end = Date.now();
  const offset = Math.round(health.time - (start + end) / 2);
  const ack = await store.getSetting('ack', 0),
    attempts = (
      await store.attempts.where('deviceId').equals(deviceId).toArray()
    )
      .filter((a) => a.seq > ack)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, 500);
  const result = await api(base, '/api/sync', SyncResponseSchema, {
    deviceId,
    attempts,
  });
  await store.mergeHistory(result.history);
  await store.setSetting('ack', result.ackSeq);
  await store.setSetting('lastSync', Date.now());
  await store.setSetting('offset', offset);
  return result;
}
export async function installPack(
  store: StudentStore,
  base: string,
  onProgress: (value: number) => void,
) {
  const manifests = await api(base, '/api/packs', z.array(PackManifestSchema));
  if (!manifests.length) throw new Error('Teacher has no packs installed');
  const roster = await api(base, '/api/roster', z.array(LearnerSchema));
  await installManifest(store, base, manifests[0], onProgress);
  await store.learners.bulkPut(roster);
}
export async function installManifest(
  store: StudentStore,
  base: string,
  manifest: PackManifest,
  onProgress: (value: number) => void,
) {
  if (!crypto.subtle)
    throw new Error(
      'Verified pack installation needs localhost, HTTPS, or the Android app. Plain HTTP LAN browser is not supported.',
    );
  const prefix = `/packs/${manifest.id}/${manifest.version}/`,
    assets: { path: string; blob: Blob; sha256: string }[] = [];
  for (const [index, asset] of manifest.assets.entries()) {
    const existing = await store.assets.get(
      `${manifest.id}/${manifest.version}/${asset.path}`,
    );
    if (existing?.sha256 === asset.sha256) {
      assets.push(existing);
      onProgress((index + 1) / manifest.assets.length);
      continue;
    }
    const response = await fetch(base + prefix + asset.path, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Cannot download ${asset.path}`);
    const bytes = await response.arrayBuffer(),
      hash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      )
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
    if (hash !== asset.sha256 || bytes.byteLength !== asset.bytes)
      throw new Error(`Pack verification failed: ${asset.path}`);
    assets.push({
      path: `${manifest.id}/${manifest.version}/${asset.path}`,
      blob: new Blob([bytes]),
      sha256: hash,
    });
    onProgress((index + 1) / manifest.assets.length);
  }
  const text = async (path: string) => {
    const asset = assets.find(
      (a) => a.path === `${manifest.id}/${manifest.version}/${path}`,
    );
    if (!asset) throw new Error('Manifest missing required file');
    return JSON.parse(await asset.blob.text()) as unknown;
  };
  const items = z.array(ItemSchema).parse(await text(manifest.itemsFile)),
    hints = z.array(HintSchema).parse(await text(manifest.hintsFile));
  const pack = PackSchema.parse({ manifest, items, hints });
  await store.transaction('rw', store.assets, store.packs, async () => {
    await store.assets.bulkPut(assets);
    await store.packs.put({ ...pack, id: manifest.id });
  });
}
