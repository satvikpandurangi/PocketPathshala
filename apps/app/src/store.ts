import Dexie, { type Table } from 'dexie';
import {
  AttemptSchema,
  type Attempt,
  type Learner,
  type Pack,
} from '@pp/shared';
export interface LocalStore {
  learners: Table<Learner, string>;
  attempts: Table<Attempt, string>;
  packs: Table<Pack & { id: string }, string>;
  assets: Table<{ path: string; blob: Blob; sha256: string }, string>;
  getSetting<T>(key: string, fallback: T): Promise<T>;
  setSetting(key: string, value: unknown): Promise<void>;
  append(data: Omit<Attempt, 'seq'>): Promise<Attempt>;
}
export class StudentStore extends Dexie implements LocalStore {
  learners!: Table<Learner, string>;
  attempts!: Table<Attempt, string>;
  packs!: Table<Pack & { id: string }, string>;
  assets!: Table<{ path: string; blob: Blob; sha256: string }, string>;
  settings!: Table<{ key: string; value: unknown }, string>;
  constructor(private readonly localDeviceId: string) {
    super(`pocket-pathshala-${localDeviceId}`);
    this.version(1).stores({
      learners: 'id',
      attempts: 'id,learnerId,deviceId,&[deviceId+seq]',
      packs: 'id',
      assets: 'path,sha256',
      settings: 'key',
      skillStates: '[learnerId+skillId]',
    });
  }
  async getSetting<T>(key: string, fallback: T): Promise<T> {
    return ((await this.settings.get(key))?.value as T) ?? fallback;
  }
  async setSetting(key: string, value: unknown) {
    await this.settings.put({ key, value });
  }
  async append(data: Omit<Attempt, 'seq'>): Promise<Attempt> {
    return this.transaction('rw', this.settings, this.attempts, async () => {
      const seq = (await this.getSetting('seq', 0)) + 1;
      const attempt = AttemptSchema.parse({ ...data, seq });
      await this.attempts.add(attempt);
      await this.setSetting('seq', seq);
      return attempt;
    });
  }
  async mergeHistory(events: Attempt[]) {
    await this.transaction('rw', this.attempts, this.settings, async () => {
      let seq = await this.getSetting('seq', 0);
      for (const a of events) {
        const existing = await this.attempts.get(a.id);
        if (!existing) await this.attempts.add(a);
        if (a.deviceId === this.localDeviceId) seq = Math.max(seq, a.seq);
      }
      await this.setSetting('seq', seq);
    });
  }
}
export function deviceIdentifier() {
  const query = new URLSearchParams(location.search).get('device');
  if (query && /^[\w-]{1,40}$/.test(query)) return query;
  const existing = localStorage.getItem('pp-device');
  if (existing) return existing;
  const value = crypto.randomUUID();
  localStorage.setItem('pp-device', value);
  return value;
}
