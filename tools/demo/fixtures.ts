import { createHash } from 'node:crypto';
import { generateItems } from '../../packages/engine/src/index';
import {
  ROSTER,
  type Attempt,
  type SkillId,
} from '../../packages/shared/src/index';
export function seedAttempts(now: number): Attempt[] {
  const items = generateItems(),
    events: Attempt[] = [];
  let seq = 0;
  const add = (
    learnerId: string,
    skillId: SkillId,
    n: number,
    correct = true,
  ) => {
    const skillItems = items.filter((i) => i.skillId === skillId);
    for (let j = 0; j < n; j++) {
      const item = skillItems[j % skillItems.length],
        option = item.options.find((o) => o.correct === correct)!;
      const hash = createHash('sha256')
        .update(`klarity-seed-${learnerId}-${skillId}-${j}-${correct}`)
        .digest('hex');
      events.push({
        id: `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`,
        deviceId: 'seed',
        seq: ++seq,
        learnerId,
        itemId: item.id,
        skillId,
        packId: 'maths-c2-c5-v1',
        packVersion: 1,
        chosen: option.value,
        correct,
        errorTag: option.errorTag ?? null,
        hintShown: !correct,
        responseMs: 2000,
        createdAt: now - 20000 + seq * 10,
      });
    }
  };
  for (const [index, l] of ROSTER.entries()) {
    if (index === 8 || index === 9) continue;
    add(l.id, 'PV2', 3);
    if (index < 4 || index === 5 || index === 7) add(l.id, 'ADD_CARRY', 3);
    if (index === 2 || index === 3) {
      add(l.id, 'SUB_BORROW', 3);
      add(l.id, 'MUL_FACTS', 3);
    }
    if (index === 5) add(l.id, 'SUB_BORROW', 3, false);
  }
  return events;
}
