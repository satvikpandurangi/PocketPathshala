import { z } from 'zod';

const id = z.string().min(1).max(100);
const time = z.number().int().nonnegative();
export const SkillIdSchema = z.enum([
  'PV2',
  'ADD_CARRY',
  'SUB_BORROW',
  'MUL_FACTS',
  'DIV_SHARE',
]);
export type SkillId = z.infer<typeof SkillIdSchema>;
export const ErrorTagSchema = z.enum([
  'SUB_NO_BORROW',
  'SUB_BORROW_NO_DECREMENT',
  'ADD_NO_CARRY',
  'PV_DIGIT_SWAP',
  'MUL_ADJACENT_FACT',
  'DIV_MULT_CONFUSION',
  'OFF_BY_TEN',
  'OFF_BY_ONE',
  'NEAR_MISS',
  'PV_COUNT_ONES',
]);
export type ErrorTag = z.infer<typeof ErrorTagSchema>;
export const LearnerSchema = z.object({
  id,
  name: z.string().min(1).max(80),
  avatar: z.string().min(1).max(20),
  grade: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  classroomId: id,
  createdAt: time,
});
export type Learner = z.infer<typeof LearnerSchema>;
export const DeviceSchema = z.object({
  id,
  label: z.string().max(100),
  lastSyncAt: time.optional(),
});
export const SkillSchema = z.object({
  id: SkillIdSchema,
  name: z.string(),
  nameKn: z.string().optional(),
  grade: z.number().int().min(1).max(5),
  prereqs: z.array(SkillIdSchema),
  order: z.number().int(),
});
export type Skill = z.infer<typeof SkillSchema>;
export const ItemSchema = z
  .object({
    id,
    skillId: SkillIdSchema,
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    prompt: z.string().min(1),
    promptKn: z.string().optional(),
    options: z
      .array(
        z.object({
          value: z.string().max(100),
          correct: z.boolean(),
          errorTag: ErrorTagSchema.optional(),
        }),
      )
      .length(3),
    imageRef: z.string().optional(),
    audioRef: z.string().optional(),
  })
  .superRefine((item, ctx) => {
    if (
      new Set(item.options.map((o) => o.value)).size !== 3 ||
      item.options.filter((o) => o.correct).length !== 1 ||
      item.options.some((o) => !o.correct && !o.errorTag)
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Three distinct choices, one correct answer and tagged distractors required',
      });
  });
export type Item = z.infer<typeof ItemSchema>;
export const HintSchema = z.object({
  errorTag: ErrorTagSchema,
  title: z.string(),
  steps: z.array(z.string()).min(1),
  audioRef: z.string().optional(),
  scaffoldSkill: SkillIdSchema,
});
export type Hint = z.infer<typeof HintSchema>;
export const AttemptSchema = z.object({
  id: z.uuid(),
  learnerId: id,
  deviceId: id,
  itemId: id,
  skillId: SkillIdSchema,
  packId: id,
  packVersion: z.number().int().positive(),
  chosen: z.string().max(100),
  correct: z.boolean(),
  errorTag: ErrorTagSchema.nullable(),
  hintShown: z.boolean(),
  responseMs: z.number().int().nonnegative().max(86400000),
  createdAt: time,
  seq: z.number().int().positive(),
  clockOffsetMs: z.number().finite().optional(),
});
export type Attempt = z.infer<typeof AttemptSchema>;
export const SkillStateSchema = z.object({
  learnerId: id,
  skillId: SkillIdSchema,
  pL: z.number().min(0).max(1),
  mastered: z.boolean(),
  attempts: z.number().int().nonnegative(),
  reviewStage: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  nextReviewAt: time.optional(),
  lastErrorTag: ErrorTagSchema.optional(),
});
export type SkillState = z.infer<typeof SkillStateSchema>;
const path = z
  .string()
  .regex(/^[\w./-]+$/)
  .refine(
    (p) => !p.includes('..') && !p.startsWith('/'),
    'Relative safe path required',
  );
export const PackManifestSchema = z.object({
  id,
  version: z.number().int().positive(),
  title: z.string(),
  language: z.enum(['kn', 'hi', 'te', 'en']),
  skills: z.array(SkillSchema),
  itemsFile: path,
  hintsFile: path,
  assets: z.array(
    z.object({
      path,
      bytes: z.number().int().nonnegative(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ),
  totalBytes: z.number().int().nonnegative(),
  createdAt: time,
});
export type PackManifest = z.infer<typeof PackManifestSchema>;
export const PackSchema = z.object({
  manifest: PackManifestSchema,
  items: z.array(ItemSchema).min(1),
  hints: z.array(HintSchema),
});
export type Pack = z.infer<typeof PackSchema>;
export const SyncCursorSchema = z.object({
  deviceId: id,
  lastAckSeq: z.number().int().nonnegative(),
});
export const SyncRequestSchema = z.object({
  deviceId: id,
  attempts: z.array(AttemptSchema).max(500),
  learnersCreated: z.array(LearnerSchema).max(50).optional(),
});
export const SyncResponseSchema = z.object({
  ackSeq: z.number().int().nonnegative(),
  rosterVersion: z.number().int(),
  packUpdates: z.array(PackManifestSchema),
  serverTime: time,
  history: z.array(AttemptSchema),
});
export const HealthSchema = z.object({
  ok: z.literal(true),
  hubId: id,
  time,
  version: z.string(),
});
export const ClockRequestSchema = z.object({
  advanceDays: z.number().min(0).max(30).optional(),
  dayMs: z.number().int().min(1000).max(86400000).optional(),
});
export const GroupSchema = z.object({
  skillId: z.string(),
  label: z.string(),
  learners: z.array(LearnerSchema),
  commonErrorTag: ErrorTagSchema.optional(),
});
export const GroupsSchema = z.object({ groups: z.array(GroupSchema), time });
export const StatsSchema = z.object({
  devices: z.array(DeviceSchema),
  attemptCount: z.number(),
  lanIn: z.number(),
  lanOut: z.number(),
  cloudBytes: z.number(),
  pendingCloud: z.number(),
  dayMs: z.number(),
  time,
  projectedMbPerStudent: z.number(),
  projectionBasis: z.string(),
});
export const DetailSchema = z.object({
  learner: LearnerSchema,
  states: z.array(SkillStateSchema),
  attempts: z.array(AttemptSchema),
});
export const SetupSchema = z.object({
  addresses: z.array(z.string()),
  qrDataUrl: z.string(),
  pack: PackManifestSchema,
  learners: z.array(LearnerSchema),
});
export const IngestSchema = z.object({
  schoolId: id,
  attempts: z.array(AttemptSchema).max(10000),
});
export const IngestAckSchema = z.object({
  acceptedIds: z.array(z.uuid()),
  simulated: z.literal(true),
});
export const FlushSchema = z.object({
  bytes: z.number(),
  count: z.number(),
  simulated: z.literal(true),
});
export const SKILLS: Skill[] = [
  {
    id: 'PV2',
    name: 'Tens and ones',
    nameKn: 'ಹತ್ತು ಮತ್ತು ಒಂದು',
    grade: 2,
    prereqs: [],
    order: 1,
  },
  {
    id: 'ADD_CARRY',
    name: 'Addition with carrying',
    nameKn: 'ಕೂಡುವುದು',
    grade: 3,
    prereqs: ['PV2'],
    order: 2,
  },
  {
    id: 'SUB_BORROW',
    name: 'Subtraction with borrowing',
    nameKn: 'ಕಳೆಯುವುದು',
    grade: 3,
    prereqs: ['PV2'],
    order: 3,
  },
  {
    id: 'MUL_FACTS',
    name: 'Multiplication facts',
    nameKn: 'ಗುಣಾಕಾರ',
    grade: 4,
    prereqs: ['ADD_CARRY'],
    order: 4,
  },
  {
    id: 'DIV_SHARE',
    name: 'Ready for division',
    nameKn: 'ಸಮಾನ ಹಂಚಿಕೆ',
    grade: 5,
    prereqs: ['MUL_FACTS'],
    order: 5,
  },
];
const names = [
  'Meena',
  'Kavya',
  'Arjun',
  'Imran',
  'Sneha',
  'Manju',
  'Asha',
  'Deepa',
  'Kiran',
  'Pooja',
  'Rohan',
  'Tara',
];
const grades: Learner['grade'][] = [4, 3, 5, 4, 2, 4, 2, 3, 5, 1, 3, 2];
const avatars = [
  '🌻',
  '🪁',
  '🐯',
  '🚀',
  '🦋',
  '🌿',
  '🐘',
  '🌺',
  '⭐',
  '🐚',
  '🦁',
  '🌈',
];
export const ROSTER: Learner[] = names.map((name, i) => ({
  id: name.toLowerCase(),
  name,
  grade: grades[i],
  avatar: avatars[i],
  classroomId: 'klarity-demo',
  createdAt: 1795602600000,
}));
