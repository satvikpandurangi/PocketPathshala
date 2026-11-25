import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { generateItems } from '../../packages/engine/src/index';
import {
  ErrorTagSchema,
  HintSchema,
  ItemSchema,
  PackManifestSchema,
  SKILLS,
  type Hint,
  type SkillId,
} from '../../packages/shared/src/index';
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const dir = resolve(ROOT, 'content/packs/maths-c2-c5-v1');
await Promise.all(
  ['items', 'hints', 'audio', 'images'].map((p) =>
    mkdir(resolve(dir, p), { recursive: true }),
  ),
);
const copy: Record<string, { title: string; steps: string[]; skill: SkillId }> =
  {
    SUB_NO_BORROW: {
      title: "Let's borrow one ten",
      steps: [
        'ಒಂದು ಹತ್ತನ್ನು ಬಿಡಿಸಿ. ಮೊದಲು ಒಂದರ ಸ್ಥಾನವನ್ನು ಕಳೆಯಿರಿ.',
        'For 52 − 27: borrow 1 ten. 12 − 7 = 5. Then 4 − 2 = 2.',
        'For 43 − 18: borrow 1 ten. 13 − 8 = 5. Then 3 − 1 = 2.',
      ],
      skill: 'SUB_BORROW',
    },
    SUB_BORROW_NO_DECREMENT: {
      title: 'A borrowed ten moves to the ones',
      steps: [
        'ಒಂದು ಹತ್ತನ್ನು ಬಿಡಿಸಿದಾಗ ಹತ್ತರ ಸ್ಥಾನದಲ್ಲಿ ಒಂದು ಕಡಿಮೆ ಮಾಡಿ.',
        'When you borrow, reduce the top tens by one before subtracting.',
      ],
      skill: 'SUB_BORROW',
    },
    ADD_NO_CARRY: {
      title: 'Ten ones make a new ten',
      steps: [
        'ಹತ್ತು ಒಂದುಗಳು ಸೇರಿ ಒಂದು ಹತ್ತು ಆಗುತ್ತದೆ.',
        'Add the ones. Carry each complete ten into the tens column.',
      ],
      skill: 'ADD_CARRY',
    },
    PV_DIGIT_SWAP: {
      title: 'Look at the tens place',
      steps: [
        'ಎಡಗಡೆಯ ಅಂಕಿ ಹತ್ತನ್ನು ಸೂಚಿಸುತ್ತದೆ.',
        'The left digit counts groups of ten; the right counts leftover ones.',
      ],
      skill: 'PV2',
    },
    PV_COUNT_ONES: {
      title: 'Count groups of ten',
      steps: [
        'ಹತ್ತರ ಗುಂಪುಗಳನ್ನು ಎಣಿಸಿ.',
        'How many complete groups of ten can you make?',
      ],
      skill: 'PV2',
    },
    MUL_ADJACENT_FACT: {
      title: 'Count equal groups',
      steps: [
        'ಸಮಾನ ಗುಂಪುಗಳನ್ನು ಎಣಿಸಿ.',
        'Skip count the same number once for each group. Stop at the requested group.',
      ],
      skill: 'MUL_FACTS',
    },
    DIV_MULT_CONFUSION: {
      title: 'Share, one at a time',
      steps: [
        'ಒಂದೊಂದಾಗಿ ಸಮಾನವಾಗಿ ಹಂಚಿ.',
        'Draw one circle for each child. Share the mangoes equally, then count one circle.',
      ],
      skill: 'DIV_SHARE',
    },
    OFF_BY_TEN: {
      title: 'Check the tens again',
      steps: [
        'ಹತ್ತರ ಸ್ಥಾನವನ್ನು ಮತ್ತೆ ನೋಡಿ.',
        'Write tens and ones separately. Check whether a ten moved.',
      ],
      skill: 'ADD_CARRY',
    },
    OFF_BY_ONE: {
      title: 'Count once more',
      steps: [
        'ಮತ್ತೊಮ್ಮೆ ಎಣಿಸಿ.',
        'Use counters or fingers. Check the last group carefully.',
      ],
      skill: 'MUL_FACTS',
    },
    NEAR_MISS: {
      title: 'Take one small step',
      steps: [
        'ನಿಧಾನವಾಗಿ ಹಂತ ಹಂತವಾಗಿ ಮಾಡಿ.',
        'Work with the ones first, then the tens. Check your answer with the opposite operation.',
      ],
      skill: 'SUB_BORROW',
    },
  };
const hints: Hint[] = ErrorTagSchema.options.map((errorTag) =>
  HintSchema.parse({
    errorTag,
    title: copy[errorTag].title,
    steps: copy[errorTag].steps,
    scaffoldSkill: copy[errorTag].skill,
  }),
);
const items = generateItems().map((i) => ItemSchema.parse(i));
await writeFile(
  resolve(dir, 'items/items.json'),
  JSON.stringify(items, null, 2),
);
await writeFile(
  resolve(dir, 'hints/hints.json'),
  JSON.stringify(hints, null, 2),
);
await writeFile(
  resolve(dir, 'images/place-value.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="90" viewBox="0 0 240 90"><rect width="240" height="90" rx="12" fill="#ede5d5"/><g fill="#1e2b6e"><rect x="20" y="15" width="14" height="60" rx="3"/><rect x="42" y="15" width="14" height="60" rx="3"/><rect x="64" y="15" width="14" height="60" rx="3"/></g><g fill="#e07b2e"><circle cx="140" cy="32" r="9"/><circle cx="167" cy="32" r="9"/><circle cx="194" cy="32" r="9"/></g><text x="119" y="70" font-size="13" fill="#1c1c1c">Tens and ones</text></svg>',
);
const files = [
  'items/items.json',
  'hints/hints.json',
  'images/place-value.svg',
];
// Real recordings placed in audio/ are included automatically after content review.
const { readdir } = await import('node:fs/promises');
for (const name of await readdir(resolve(dir, 'audio')))
  if (/\.(mp3|opus|ogg)$/.test(name)) files.push(`audio/${name}`);
for (const h of hints) {
  const recording = files.find(
    (p) => p === `audio/${h.errorTag.toLowerCase()}.mp3`,
  );
  if (recording) h.audioRef = recording;
}
await writeFile(
  resolve(dir, 'hints/hints.json'),
  JSON.stringify(hints, null, 2),
);
const assets = await Promise.all(
  files.map(async (path) => {
    const bytes = await readFile(resolve(dir, path));
    return {
      path,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }),
);
const manifest = PackManifestSchema.parse({
  id: 'maths-c2-c5-v1',
  version: 1,
  title: 'Small steps, strong foundations',
  language: 'kn',
  skills: SKILLS,
  itemsFile: 'items/items.json',
  hintsFile: 'hints/hints.json',
  assets,
  totalBytes: assets.reduce((n, a) => n + a.bytes, 0),
  createdAt: 1795602600000,
});
await writeFile(resolve(dir, 'pack.json'), JSON.stringify(manifest, null, 2));
const publicDir = resolve(ROOT, 'apps/app/public/packs/maths-c2-c5-v1/1');
await mkdir(publicDir, { recursive: true });
await cp(dir, publicDir, { recursive: true });
console.log(
  `Validated ${items.length} items, ${hints.length} hints, ${manifest.totalBytes} asset bytes. Audio: ${files.filter((f) => f.startsWith('audio/')).length}/10 real clips.`,
);
