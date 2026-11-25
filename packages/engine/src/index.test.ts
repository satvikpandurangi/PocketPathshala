import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  ROSTER,
  ItemSchema,
  SkillStateSchema,
  type Attempt,
  type SkillId,
} from '@pp/shared';
import {
  bkt,
  generateItems,
  groupLearners,
  initialState,
  replay,
  selectNext,
  subtractionDistractors,
  update,
} from './index';

export function event(
  seq: number,
  skillId: SkillId = 'PV2',
  correct = true,
  extra: Partial<Attempt> = {},
): Attempt {
  return {
    id: randomUUID(),
    deviceId: 'test',
    learnerId: 'meena',
    itemId: 'pv2-00',
    skillId,
    packId: 'maths-c2-c5-v1',
    packVersion: 1,
    chosen: '2',
    correct,
    errorTag: null,
    hintShown: false,
    responseMs: 1000,
    createdAt: 1000 + seq,
    seq,
    ...extra,
  };
}
describe('BKT', () => {
  it('matches both Bayesian posterior calculations', () => {
    expect(bkt(0.2, true)).toBeCloseTo(0.552631578947);
    expect(bkt(0.2, false)).toBeCloseTo(0.177419354839);
  });
  it('rejects invalid parameters', () => {
    expect(() => bkt(0.2, true, { pGuess: 0 })).toThrow();
    expect(() => bkt(2, true)).toThrow();
  });
  it('supports per-skill configuration', () => {
    expect(
      replay('meena', [event(1)], { params: { PV2: { pTransit: 0.3 } } })[0].pL,
    ).toBeCloseTo(bkt(0.2, true, { pTransit: 0.3 }));
  });
});
describe('content', () => {
  it('has reproducible distinct tagged choices', () => {
    const items = generateItems();
    expect(items).toEqual(generateItems());
    expect(items).toHaveLength(90);
    for (const i of items) expect(ItemSchema.safeParse(i).success).toBe(true);
  });
  it('preserves the video item and distinct borrow misconceptions', () => {
    const item = generateItems().find((i) => i.id === 'sub-video')!;
    expect(item.options.map((o) => o.value)).toEqual(['25', '35', '29']);
    expect(item.options.find((o) => o.value === '35')?.errorTag).toBe(
      'SUB_NO_BORROW',
    );
    expect(subtractionDistractors(41, 17).map((w) => w.value)).toEqual([
      36, 34,
    ]);
  });
});
describe('review, selection and replay', () => {
  it('normalizes fractional round-trip clock estimates to valid millisecond dates', () => {
    const state = replay('meena', [
      event(1, 'PV2', true, { clockOffsetMs: 0.5 }),
      event(2, 'PV2', true, { clockOffsetMs: 0.5 }),
    ])[0];
    expect(state.mastered).toBe(true);
    expect(Number.isInteger(state.nextReviewAt)).toBe(true);
    expect(SkillStateSchema.safeParse(state).success).toBe(true);
  });
  it('schedules 1,3,7 days and resets a failed review', () => {
    const config = { dayMs: 1000 };
    let state = initialState('meena', 'PV2');
    for (let n = 1; n <= 3; n++) state = update(state, event(n), config);
    expect(state.mastered).toBe(true);
    expect(state.nextReviewAt).toBe(2002);
    state = update(state, event(4, 'PV2', true, { createdAt: 2003 }), config);
    expect(state.reviewStage).toBe(1);
    expect(state.nextReviewAt).toBe(5003);
    state = update(state, event(5, 'PV2', true, { createdAt: 5003 }), config);
    expect(state.nextReviewAt).toBe(12003);
    state = update(state, event(6, 'PV2', false, { createdAt: 12003 }), config);
    expect(state.reviewStage).toBe(0);
    expect(state.mastered).toBe(state.pL >= 0.75);
    const failed = update(
      { ...state, pL: 0.76, mastered: true, nextReviewAt: 12003 },
      event(7, 'PV2', false, { createdAt: 12003 }),
      config,
    );
    expect(failed.mastered).toBe(false);
    expect(failed.nextReviewAt).toBeUndefined();
  });
  it('replays shuffled and duplicate input identically', () => {
    const a = [event(1), event(2), event(3, 'ADD_CARRY', false)];
    expect(replay('meena', a)).toEqual(
      replay('meena', [a[2], a[0], a[1], a[0]]),
    );
  });
  it('prioritizes scaffold then review then frontier, avoids immediate repeat', () => {
    const items = generateItems(),
      history = [event(1), event(2), event(3)];
    expect(selectNext('meena', [], items, 1000).reason).toBe('frontier');
    expect(
      selectNext('meena', history, items, 4000, { dayMs: 1000 }).reason,
    ).toBe('review');
    history.push(
      event(4, 'SUB_BORROW', false, {
        itemId: 'sub-video',
        errorTag: 'SUB_NO_BORROW',
      }),
    );
    expect(
      selectNext('meena', history, items, 4000, { dayMs: 1000 }),
    ).toMatchObject({ reason: 'scaffold', item: { id: 'sub-scaffold' } });
    expect(selectNext('meena', [event(1)], items, 1000).item.id).not.toBe(
      'pv2-00',
    );
  });
  it('groups Meena C4 and Kavya C3 by borrowing rather than grade', () => {
    const history = ['meena', 'kavya'].flatMap((learnerId) =>
      [1, 2, 3].flatMap((n) => [
        event(n, 'PV2', true, { learnerId }),
        event(n + 3, 'ADD_CARRY', true, { learnerId }),
      ]),
    );
    const group = groupLearners(ROSTER.slice(0, 2), history, 1100).find(
      (g) => g.skillId === 'SUB_BORROW',
    );
    expect(group?.learners.map((l) => l.grade)).toEqual([4, 3]);
  });
  it('prioritizes repeated-error and inactive learners', () => {
    const history = [1, 2, 3].map((n) =>
      event(n, 'SUB_BORROW', false, { errorTag: 'SUB_NO_BORROW' }),
    );
    expect(groupLearners(ROSTER.slice(0, 1), history, 1100)[0].skillId).toBe(
      'NEEDS_YOU',
    );
    expect(
      groupLearners(ROSTER.slice(0, 1), [event(1)], 5000, { dayMs: 1000 })[0]
        .skillId,
    ).toBe('NEEDS_YOU');
  });
});
