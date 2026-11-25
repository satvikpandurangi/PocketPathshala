import {
  SKILLS,
  type Attempt,
  type ErrorTag,
  type Item,
  type Learner,
  type SkillId,
  type SkillState,
} from '@pp/shared';
export const DEFAULT_DAY_MS = 86400000;
export const MASTERY_THRESHOLD = 0.75;
export type BktParams = {
  pInit: number;
  pTransit: number;
  pSlip: number;
  pGuess: number;
};
export const DEFAULT_BKT: BktParams = {
  pInit: 0.2,
  pTransit: 0.15,
  pSlip: 0.1,
  pGuess: 0.25,
};
export type EngineConfig = {
  dayMs?: number;
  params?: Partial<Record<SkillId, Partial<BktParams>>>;
};
function parameters(params: Partial<BktParams> = {}): BktParams {
  const p = { ...DEFAULT_BKT, ...params };
  if (Object.values(p).some((v) => !Number.isFinite(v) || v <= 0 || v >= 1))
    throw new Error('BKT parameters must be strictly between zero and one');
  return p;
}
export function bkt(
  pL: number,
  correct: boolean,
  params: Partial<BktParams> = {},
): number {
  if (!Number.isFinite(pL) || pL < 0 || pL > 1)
    throw new Error('Invalid mastery probability');
  const p = parameters(params),
    known = correct ? 1 - p.pSlip : p.pSlip,
    unknown = correct ? p.pGuess : 1 - p.pGuess;
  const posterior = (pL * known) / (pL * known + (1 - pL) * unknown);
  return posterior + (1 - posterior) * p.pTransit;
}
export function initialState(
  learnerId: string,
  skillId: SkillId,
  config: EngineConfig = {},
): SkillState {
  return {
    learnerId,
    skillId,
    pL: parameters(config.params?.[skillId]).pInit,
    mastered: false,
    attempts: 0,
    reviewStage: 0,
  };
}
export function orderedAttempts(attempts: Attempt[]): Attempt[] {
  return [...new Map(attempts.map((a) => [a.id, a])).values()].sort(
    (a, b) =>
      a.createdAt +
        (a.clockOffsetMs ?? 0) -
        (b.createdAt + (b.clockOffsetMs ?? 0)) ||
      a.deviceId.localeCompare(b.deviceId) ||
      a.seq - b.seq ||
      a.id.localeCompare(b.id),
  );
}
export function update(
  state: SkillState,
  attempt: Attempt,
  config: EngineConfig = {},
): SkillState {
  const dayMs = config.dayMs ?? DEFAULT_DAY_MS;
  if (!Number.isFinite(dayMs) || dayMs <= 0)
    throw new Error('Invalid day duration');
  const now = Math.round(attempt.createdAt + (attempt.clockOffsetMs ?? 0)),
    pL = bkt(state.pL, attempt.correct, config.params?.[state.skillId]),
    mastered = pL >= MASTERY_THRESHOLD;
  let stage = state.reviewStage,
    next = state.nextReviewAt;
  const due = state.mastered && next !== undefined && next <= now;
  if (!mastered) {
    stage = 0;
    next = undefined;
  } else if (!state.mastered) {
    stage = 0;
    next = now + dayMs;
  } else if (due) {
    if (attempt.correct) {
      stage = Math.min(3, stage + 1) as SkillState['reviewStage'];
      next = now + [1, 3, 7, 7][stage] * dayMs;
    } else {
      stage = 0;
      next = now + dayMs;
    }
  }
  return {
    ...state,
    pL,
    mastered,
    attempts: state.attempts + 1,
    reviewStage: stage,
    nextReviewAt: next,
    lastErrorTag: attempt.errorTag ?? state.lastErrorTag,
  };
}
export function replay(
  learnerId: string,
  attempts: Attempt[],
  config: EngineConfig = {},
): SkillState[] {
  const states = SKILLS.map((s) => initialState(learnerId, s.id, config));
  for (const a of orderedAttempts(attempts).filter(
    (a) => a.learnerId === learnerId,
  )) {
    const index = states.findIndex((s) => s.skillId === a.skillId);
    states[index] = update(states[index], a, config);
  }
  return states;
}
export function frontier(states: SkillState[]): SkillId | null {
  return (
    SKILLS.find(
      (skill) =>
        !states.find((s) => s.skillId === skill.id)?.mastered &&
        skill.prereqs.every(
          (id) => states.find((s) => s.skillId === id)?.mastered,
        ),
    )?.id ?? null
  );
}
export type Selection = {
  item: Item;
  reason: 'scaffold' | 'review' | 'frontier' | 'mixed';
};
export function selectNext(
  learnerId: string,
  attempts: Attempt[],
  items: Item[],
  now: number,
  config: EngineConfig = {},
): Selection {
  const history = orderedAttempts(attempts).filter(
      (a) => a.learnerId === learnerId,
    ),
    states = replay(learnerId, history, config),
    last = history.at(-1);
  let skillId: SkillId, difficulty: 1 | 2 | 3, reason: Selection['reason'];
  if (last && !last.correct && last.errorTag) {
    skillId = last.skillId;
    difficulty = Math.max(
      1,
      (items.find((i) => i.id === last.itemId)?.difficulty ?? 2) - 1,
    ) as 1 | 2;
    reason = 'scaffold';
  } else {
    const due = states
      .filter(
        (s) =>
          s.mastered && s.nextReviewAt !== undefined && s.nextReviewAt <= now,
      )
      .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))[0];
    const f = frontier(states);
    skillId = due?.skillId ?? f ?? SKILLS[history.length % SKILLS.length].id;
    const pL = states.find((s) => s.skillId === skillId)?.pL ?? 0.2;
    difficulty = pL < 0.4 ? 1 : pL < 0.65 ? 2 : 3;
    reason = due ? 'review' : f ? 'frontier' : 'mixed';
  }
  const recent = new Set(history.slice(-10).map((a) => a.itemId));
  let candidates = items.filter(
    (i) => i.skillId === skillId && i.id !== last?.itemId,
  );
  if (!candidates.length)
    throw new Error(`No non-repeating item for ${skillId}`);
  if (reason === 'scaffold' && last?.errorTag) {
    const tagged = candidates.filter((i) =>
      i.options.some((o) => o.errorTag === last.errorTag),
    );
    if (tagged.length) candidates = tagged;
  }
  const fresh = candidates.filter((i) => !recent.has(i.id));
  if (fresh.length) candidates = fresh;
  candidates.sort(
    (a, b) =>
      Math.abs(a.difficulty - difficulty) -
        Math.abs(b.difficulty - difficulty) || a.id.localeCompare(b.id),
  );
  // The curated video scaffold is the preferred first borrowing follow-up.
  const video =
    reason === 'scaffold' && last?.itemId === 'sub-video'
      ? candidates.find((i) => i.id === 'sub-scaffold')
      : undefined;
  const introduction =
    reason === 'frontier' &&
    skillId === 'SUB_BORROW' &&
    !history.some((a) => a.skillId === 'SUB_BORROW')
      ? items.find((i) => i.id === 'sub-video')
      : undefined;
  return { item: video ?? introduction ?? candidates[0], reason };
}
export function groupLearners(
  learners: Learner[],
  attempts: Attempt[],
  now: number,
  config: EngineConfig = {},
) {
  const groups = new Map<
    string,
    {
      skillId: string;
      label: string;
      learners: Learner[];
      commonErrorTag?: ErrorTag;
    }
  >();
  const tags = new Map<string, ErrorTag[]>();
  for (const learner of learners) {
    const history = orderedAttempts(attempts).filter(
        (a) => a.learnerId === learner.id,
      ),
      last = history.at(-1),
      tail = history.slice(-3);
    const needs =
      (tail.length === 3 &&
        tail.every(
          (a) =>
            !a.correct &&
            a.errorTag !== null &&
            a.errorTag === tail[0].errorTag,
        )) ||
      (last !== undefined &&
        now - (last.createdAt + (last.clockOffsetMs ?? 0)) >
          2 * (config.dayMs ?? DEFAULT_DAY_MS));
    const f = frontier(replay(learner.id, history, config)),
      key = needs ? 'NEEDS_YOU' : (f ?? 'ALL_MASTERED');
    if (!groups.has(key))
      groups.set(key, {
        skillId: key,
        label: needs
          ? 'Needs you'
          : (SKILLS.find((s) => s.id === f)?.name ?? 'All mastered'),
        learners: [],
      });
    groups.get(key)!.learners.push(learner);
    tags.set(key, [
      ...(tags.get(key) ?? []),
      ...history.slice(-10).flatMap((a) => (a.errorTag ? [a.errorTag] : [])),
    ]);
  }
  for (const [key, g] of groups) {
    const counts = new Map<ErrorTag, number>();
    for (const t of tags.get(key) ?? [])
      counts.set(t, (counts.get(t) ?? 0) + 1);
    g.commonErrorTag = [...counts].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0];
  }
  return [...groups.values()].sort(
    (a, b) =>
      (a.skillId === 'NEEDS_YOU' ? -1 : b.skillId === 'NEEDS_YOU' ? 1 : 0) ||
      a.label.localeCompare(b.label),
  );
}
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function subtractionDistractors(a: number, b: number) {
  const at = Math.floor(a / 10),
    ao = a % 10,
    bt = Math.floor(b / 10),
    bo = b % 10;
  return [
    {
      value: Math.abs(at - bt) * 10 + Math.abs(ao - bo),
      errorTag: 'SUB_NO_BORROW' as const,
    },
    {
      value: (at - bt) * 10 + ao + 10 - bo,
      errorTag: 'SUB_BORROW_NO_DECREMENT' as const,
    },
  ];
}
export function generateItems(seed = 2026, countPerSkill = 18): Item[] {
  const random = seededRandom(seed),
    int = (min: number, max: number) =>
      min + Math.floor(random() * (max - min + 1)),
    items: Item[] = [];
  for (const skill of SKILLS)
    for (let n = 0; n < countPerSkill; n++) {
      const difficulty = ((n % 3) + 1) as 1 | 2 | 3;
      let a = int(2, 4 + difficulty * 2) * 10 + int(1, 4),
        b = int(1, Math.floor(a / 10) - 1) * 10 + int(6, 9),
        answer: number,
        prompt: string,
        wrong: { value: number; errorTag: ErrorTag }[] = [];
      if (skill.id === 'SUB_BORROW') {
        answer = a - b;
        prompt = `${a} − ${b}`;
        wrong = subtractionDistractors(a, b);
      } else if (skill.id === 'PV2') {
        if (a % 10 === Math.floor(a / 10)) a += 1;
        answer = Math.floor(a / 10);
        prompt = `How many tens are in ${a}?`;
        wrong = [
          { value: a % 10, errorTag: 'PV_DIGIT_SWAP' },
          { value: a, errorTag: 'PV_COUNT_ONES' },
        ];
      } else if (skill.id === 'ADD_CARRY') {
        a = int(1, 3 + difficulty) * 10 + int(6, 9);
        b = int(1, 3 + difficulty) * 10 + int(6, 9);
        answer = a + b;
        prompt = `${a} + ${b}`;
        wrong = [
          { value: answer - 10, errorTag: 'ADD_NO_CARRY' },
          { value: answer + 10, errorTag: 'OFF_BY_TEN' },
        ];
      } else if (skill.id === 'MUL_FACTS') {
        a = int(2, 5);
        b = int(2, 3 + difficulty * 2);
        answer = a * b;
        prompt = `${a} × ${b}`;
        wrong = [
          { value: answer + a, errorTag: 'MUL_ADJACENT_FACT' },
          { value: answer - a, errorTag: 'OFF_BY_ONE' },
        ];
      } else {
        b = int(2, 5);
        answer = int(2, 3 + difficulty * 2);
        a = b * answer;
        prompt = `Share ${a} mangoes equally among ${b} children. How many each?`;
        wrong = [
          { value: a * b, errorTag: 'DIV_MULT_CONFUSION' },
          { value: answer + 1, errorTag: 'OFF_BY_ONE' },
        ];
      }
      const options: Item['options'] = [
          { value: String(answer), correct: true },
        ],
        seen = new Set([answer]);
      for (const w of wrong)
        if (!seen.has(w.value)) {
          seen.add(w.value);
          options.push({
            value: String(w.value),
            correct: false,
            errorTag: w.errorTag,
          });
        }
      for (let delta = 2; options.length < 3; delta++)
        if (!seen.has(answer + delta)) {
          seen.add(answer + delta);
          options.push({
            value: String(answer + delta),
            correct: false,
            errorTag: 'NEAR_MISS',
          });
        }
      const shift = int(0, 2);
      options.push(...options.splice(0, shift));
      items.push({
        id: `${skill.id.toLowerCase()}-${String(n).padStart(2, '0')}`,
        skillId: skill.id,
        difficulty,
        prompt,
        options,
        imageRef: skill.id === 'PV2' ? 'images/place-value.svg' : undefined,
      });
    }
  const sub = items.findIndex((i) => i.skillId === 'SUB_BORROW');
  items[sub] = {
    id: 'sub-video',
    skillId: 'SUB_BORROW',
    difficulty: 2,
    prompt: '52 − 27',
    options: [
      { value: '25', correct: true },
      { value: '35', correct: false, errorTag: 'SUB_NO_BORROW' },
      { value: '29', correct: false, errorTag: 'NEAR_MISS' },
    ],
  };
  items[sub + 1] = {
    id: 'sub-scaffold',
    skillId: 'SUB_BORROW',
    difficulty: 1,
    prompt: '43 − 18',
    options: [
      { value: '35', correct: false, errorTag: 'SUB_NO_BORROW' },
      { value: '25', correct: true },
      { value: '21', correct: false, errorTag: 'NEAR_MISS' },
    ],
  };
  return items;
}
