import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { StudentStore } from './store';
import { type Attempt } from '@pp/shared';
const stores: StudentStore[] = [];
afterEach(async () => {
  for (const s of stores.splice(0)) await s.delete();
});
function data(learnerId = 'meena'): Omit<Attempt, 'seq'> {
  return {
    id: crypto.randomUUID(),
    learnerId,
    deviceId: 'store-test',
    itemId: 'sub-video',
    skillId: 'SUB_BORROW',
    packId: 'maths-c2-c5-v1',
    packVersion: 1,
    chosen: '35',
    correct: false,
    errorTag: 'SUB_NO_BORROW',
    hintShown: true,
    responseMs: 1500,
    createdAt: 1000,
  };
}
describe('device persistence', () => {
  it('allocates sequences atomically and partitions learner records', async () => {
    const store = new StudentStore('test-' + crypto.randomUUID());
    stores.push(store);
    const results = await Promise.all([
      store.append(data()),
      store.append(data('kavya')),
    ]);
    expect(results.map((a) => a.seq)).toEqual([1, 2]);
    expect(
      await store.attempts.where('learnerId').equals('meena').count(),
    ).toBe(1);
    await store.setSetting('ack', 1);
    store.close();
    await store.open();
    expect(await store.getSetting('ack', 0)).toBe(1);
    expect(await store.attempts.count()).toBe(2);
  });
  it('merges hub history without duplicates', async () => {
    const store = new StudentStore('test-' + crypto.randomUUID());
    stores.push(store);
    const a = await store.append(data());
    await store.mergeHistory([a, a]);
    expect(await store.attempts.count()).toBe(1);
  });
  it('resumes a restored device sequence after history pull', async () => {
    const store = new StudentStore('store-test');
    stores.push(store);
    await store.mergeHistory([{ ...data(), seq: 7 }]);
    expect((await store.append(data())).seq).toBe(8);
  });
});
