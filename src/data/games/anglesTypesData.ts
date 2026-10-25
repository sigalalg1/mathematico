import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { AngleOrderOption, AnglesDifficultyId, AngleTypeChallenge } from '../../types/anglesGrade7';
import type { AngleType7 } from '../../geometry/types';
import {
  CLASSIFICATION_SAFETY_MARGIN_DEG,
  classifyAngle7,
  isUnambiguouslyClassifiable,
} from '../../geometry/angleMath';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import { buildVertexScene, pickLabels, randomBaseRotation } from './anglesGrade7Shared';

/**
 * Skill B (textbook-sourced — chapter 20): the four angle types
 * (חדה/ישרה/קהה/שטוחה) and ordering angles by size. Two interaction kinds:
 *  - `classify`: one angle, choose its type from the four — enforces the
 *    mandatory classification safety margin from `geometry/angleMath`.
 *  - `order`: several separately-drawn angles, tap the smallest/largest —
 *    a scoped-down version of the textbook's "order these by size" exercise
 *    (full drag-to-reorder is out of scope; see the final report).
 */
export const ANGLES_TYPES_RULES_VERSION = 1;

const ANGLE_TYPES: AngleType7[] = ['acute', 'right', 'obtuse', 'straight'];

const ACUTE_RANGE = { min: CLASSIFICATION_SAFETY_MARGIN_DEG, max: 90 - CLASSIFICATION_SAFETY_MARGIN_DEG };
const OBTUSE_RANGE = { min: 90 + CLASSIFICATION_SAFETY_MARGIN_DEG, max: 180 - CLASSIFICATION_SAFETY_MARGIN_DEG };

/**
 * Picks a degree measure for the requested type, always respecting the
 * mandatory classification safety margin: acute/obtuse are drawn from a
 * range that is, by construction, at least `CLASSIFICATION_SAFETY_MARGIN_DEG`
 * away from every boundary; right/straight are exact (within float
 * tolerance), which is the deliberate-boundary case the margin rule allows.
 */
function pickDegreesForType(random: () => number, type: AngleType7): number {
  if (type === 'right') return 90;
  if (type === 'straight') return 180;
  const range = type === 'acute' ? ACUTE_RANGE : OBTUSE_RANGE;
  return randomInt(random, range.min, range.max);
}

const ORDER_OPTION_COUNT: Record<AnglesDifficultyId, number> = { basic: 3, intermediate: 4, advanced: 4 };
const ORDER_MIN_GAP_DEG: Record<AnglesDifficultyId, number> = { basic: 28, intermediate: 18, advanced: 10 };

function makeClassifyChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleTypeChallenge {
  const type = pickRandom(random, ANGLE_TYPES);
  const degrees = pickDegreesForType(random, type);
  const [vertexLabel, armA, armB] = pickLabels(random, 3);
  const scene = buildVertexScene(random, vertexLabel, [0, degrees], [armA, armB], {
    baseRotationDeg: randomBaseRotation(random, difficulty),
  });
  const ref = { vertexId: 'vertex', rayAId: scene.rays[0].id, rayBId: scene.rays[1].id };
  return {
    id: `angles-types-classify-${difficulty}-${index}`,
    kind: 'classify',
    difficulty,
    scene,
    ref,
    degrees,
    answer: type,
    options: shuffle([...ANGLE_TYPES], random),
    feedbackKey: `anglesGrade7.types.feedback.${type}`,
  };
}

function makeOrderChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleTypeChallenge {
  const count = ORDER_OPTION_COUNT[difficulty];
  const minGap = ORDER_MIN_GAP_DEG[difficulty];

  // Distinct degree measures with a guaranteed minimum gap between every
  // pair, so "which is smallest/largest" always has one unambiguous answer
  // no matter how the angles are individually rotated.
  const degreesList: number[] = [];
  let attempts = 0;
  while (degreesList.length < count && attempts < 200) {
    attempts += 1;
    const candidate = randomInt(random, 15, 165);
    if (degreesList.every((existing) => Math.abs(existing - candidate) >= minGap)) degreesList.push(candidate);
  }
  // Deterministic fallback (never hit in practice at these ranges/gaps, but keeps the generator total).
  while (degreesList.length < count) degreesList.push(15 + degreesList.length * minGap);

  const options: AngleOrderOption[] = degreesList.map((degrees, i) => {
    const [vertexLabel, armA, armB] = pickLabels(random, 3);
    const scene = buildVertexScene(random, vertexLabel, [0, degrees], [armA, armB], {
      baseRotationDeg: randomBaseRotation(random, difficulty),
    });
    return { id: `opt-${i}`, scene, ref: { vertexId: 'vertex', rayAId: scene.rays[0].id, rayBId: scene.rays[1].id }, degrees };
  });

  const mode: 'smallest' | 'largest' = random() < 0.5 ? 'smallest' : 'largest';
  const sorted = [...options].sort((a, b) => a.degrees - b.degrees);
  const answer = (mode === 'smallest' ? sorted[0] : sorted[sorted.length - 1]).id;

  return {
    id: `angles-types-order-${difficulty}-${index}`,
    kind: 'order',
    difficulty,
    options: shuffle(options, random),
    mode,
    answer,
    feedbackKey: `anglesGrade7.types.feedback.order.${mode}`,
  };
}

const KIND_POOL: Record<AnglesDifficultyId, Array<'classify' | 'order'>> = {
  basic: ['classify', 'classify', 'classify', 'order'],
  intermediate: ['classify', 'order', 'classify', 'order'],
  advanced: ['order', 'classify', 'order', 'order'],
};

export function assertAngleTypeChallengeIsSound(challenge: AngleTypeChallenge): void {
  if (challenge.kind === 'classify') {
    if (new Set(challenge.options).size !== challenge.options.length) throw new Error('duplicate type options');
    if (challenge.options.filter((option) => option === challenge.answer).length !== 1) {
      throw new Error('classify question must have exactly one correct type');
    }
    if (classifyAngle7(challenge.degrees) !== challenge.answer) {
      throw new Error(`classify answer disagrees with the actual measured angle (${challenge.degrees}°)`);
    }
    if (!isUnambiguouslyClassifiable(challenge.degrees)) {
      throw new Error(`classify angle ${challenge.degrees}° violates the mandatory classification safety margin`);
    }
    return;
  }
  const ids = challenge.options.map((option) => option.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate order options');
  if (!ids.includes(challenge.answer)) throw new Error('order answer must be one of the offered options');
  const sorted = [...challenge.options].sort((a, b) => a.degrees - b.degrees);
  const expected = challenge.mode === 'smallest' ? sorted[0].id : sorted[sorted.length - 1].id;
  if (expected !== challenge.answer) throw new Error('order answer disagrees with the actual measured angles');
}

export interface AnglesTypesTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildAnglesTypesQuestions({ difficultyId, count, seed }: AnglesTypesTrainingInput): TrainingQuestion<AngleTypeChallenge>[] {
  const difficulty: AnglesDifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KIND_POOL[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const kind = kinds[index % kinds.length];
    const challenge = kind === 'classify' ? makeClassifyChallenge(difficulty, index, random) : makeOrderChallenge(difficulty, index, random);
    assertAngleTypeChallengeIsSound(challenge);
    const prompt = challenge.kind === 'classify' ? 'anglesGrade7.types.prompt.classify' : `anglesGrade7.types.prompt.order.${challenge.mode}`;
    const options = challenge.kind === 'classify' ? challenge.options : challenge.options.map((o) => o.id);
    return {
      id: challenge.id,
      prompt,
      answer: challenge.answer,
      options,
      payload: challenge,
    };
  });
}

export const ANGLES_TYPES_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 10, 15],
  defaultQuestionCount: 10,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'anglesGrade7.types.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'anglesGrade7.types.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'anglesGrade7.types.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: ANGLES_TYPES_RULES_VERSION,
};

export const anglesTypesActivity: TrainingActivityDefinition<AngleTypeChallenge> = {
  id: 'anglesTypes',
  i18nPrefix: 'anglesGrade7.types',
  capabilities: ANGLES_TYPES_CAPABILITIES,
  generateQuestions: buildAnglesTypesQuestions,
};
