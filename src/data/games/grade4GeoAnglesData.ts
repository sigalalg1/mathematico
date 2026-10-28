import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { AngleType7, VertexScene } from '../../geometry/types';
import type { Geo4AngleChallenge, Geo4AngleKind, Geo4DifficultyId } from '../../types/geometryGrade4';
import {
  CLASSIFICATION_SAFETY_MARGIN_DEG,
  angleBetweenRays,
  classifyAngle7,
  isUnambiguouslyClassifiable,
  normalizeDegrees,
  pointFromAngle,
} from '../../geometry/angleMath';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import { STAGE_CENTER, pickLabels, randomRotation } from './grade4GeoShared';

/**
 * Group 2 — angles (מכירים זוויות). Deliberately reuses the Grade 7 Angles
 * unit's own vertex-scene angle engine (`geometry/angleMath`,
 * `geometry/types`'s `VertexScene`) rather than a parallel model, with
 * friendlier wording and the `grade4GeometryStyle` preset — exactly the
 * mission brief's instruction for this group. Every classification here
 * reuses `isUnambiguouslyClassifiable`/`CLASSIFICATION_SAFETY_MARGIN_DEG`
 * rather than re-deriving a safety margin.
 */
export const GEO4_ANGLES_RULES_VERSION = 1;

const TYPES_BY_DIFFICULTY: Record<Geo4DifficultyId, AngleType7[]> = {
  basic: ['acute', 'right', 'obtuse'],
  intermediate: ['acute', 'right', 'obtuse', 'straight'],
  advanced: ['acute', 'right', 'obtuse', 'straight'],
};

const KIND_POOL: Record<Geo4DifficultyId, Geo4AngleKind[]> = {
  basic: ['tapVertexOrArm', 'classifyType', 'classifyType'],
  intermediate: ['tapVertexOrArm', 'classifyType', 'selectAllRight', 'compareRayLength'],
  advanced: ['classifyType', 'selectAllRight', 'compareRayLength', 'tapVertexOrArm'],
};

function buildAngleScene(random: () => number, difficulty: Geo4DifficultyId, degrees: number, center = STAGE_CENTER): VertexScene {
  const [vertexLabel, armA, armB] = pickLabels(random, 3);
  const base = randomRotation(random, difficulty);
  return {
    vertex: { id: 'vertex', label: vertexLabel, point: center },
    rays: [
      { id: 'ray-0', label: armA, through: pointFromAngle(center, base, 80 + randomInt(random, 0, 40)) },
      { id: 'ray-1', label: armB, through: pointFromAngle(center, normalizeDegrees(base + degrees), 80 + randomInt(random, 0, 40)) },
    ],
  };
}

/** Picks a degree measure that is unambiguously classifiable, resampling a bounded number of times rather than trusting one draw. */
function pickClassifiableDegrees(random: () => number, type: AngleType7): number {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    let degrees: number;
    if (type === 'right') degrees = 90;
    else if (type === 'straight') degrees = 180;
    else if (type === 'acute') degrees = randomInt(random, CLASSIFICATION_SAFETY_MARGIN_DEG + 3, 90 - CLASSIFICATION_SAFETY_MARGIN_DEG - 3);
    else degrees = randomInt(random, 90 + CLASSIFICATION_SAFETY_MARGIN_DEG + 3, 180 - CLASSIFICATION_SAFETY_MARGIN_DEG - 3);
    if (isUnambiguouslyClassifiable(degrees)) return degrees;
  }
  return type === 'right' ? 90 : type === 'straight' ? 180 : type === 'acute' ? 45 : 135;
}

function makeTapVertexOrArmChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4AngleChallenge {
  const degrees = pickClassifiableDegrees(random, pickRandom(random, TYPES_BY_DIFFICULTY[difficulty]));
  const scene = buildAngleScene(random, difficulty, degrees);
  const target: 'vertex' | 'arm' = pickRandom(random, ['vertex', 'arm'] as const);
  return {
    id: `geo4-angles-tap-${difficulty}-${index}`,
    kind: 'tapVertexOrArm',
    difficulty,
    scene,
    promptKey: target === 'vertex' ? 'grade4Geometry.angles.prompt.tapVertex' : 'grade4Geometry.angles.prompt.tapArm',
    answer: target,
    options: ['vertex', 'arm'],
    feedbackKey: target === 'vertex' ? 'grade4Geometry.angles.feedback.tapVertex' : 'grade4Geometry.angles.feedback.tapArm',
  };
}

function makeClassifyTypeChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4AngleChallenge {
  const types = TYPES_BY_DIFFICULTY[difficulty];
  const type = pickRandom(random, types);
  const degrees = pickClassifiableDegrees(random, type);
  const scene = buildAngleScene(random, difficulty, degrees);
  const options = shuffle([...types], random);
  return {
    id: `geo4-angles-classify-${difficulty}-${index}`,
    kind: 'classifyType',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.angles.prompt.classify',
    answer: type,
    options,
    feedbackKey: `grade4Geometry.angles.feedback.classify.${type}`,
  };
}

function makeSelectAllRightChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4AngleChallenge {
  const positions = [
    { x: 90, y: 100 },
    { x: 230, y: 100 },
    { x: 160, y: 235 },
  ];
  const count = 3;
  const rightCount = randomInt(random, 1, 2);
  const slots = shuffle(Array.from({ length: count }, (_, i) => i), random);
  const rightSlots = new Set(slots.slice(0, rightCount));
  const gallery = Array.from({ length: count }, (_, i) => {
    const isRight = rightSlots.has(i);
    const degrees = isRight ? 90 : pickClassifiableDegrees(random, pickRandom(random, ['acute', 'obtuse'] as const));
    const scene = buildAngleScene(random, difficulty, degrees, positions[i]);
    return { id: `g${i}`, scene, isRight };
  });
  const answer = gallery
    .filter((g) => g.isRight)
    .map((g) => g.id)
    .sort()
    .join(',');
  return {
    id: `geo4-angles-selectright-${difficulty}-${index}`,
    kind: 'selectAllRight',
    difficulty,
    gallery,
    promptKey: 'grade4Geometry.angles.prompt.selectAllRight',
    answer,
    options: [answer],
    feedbackKey: 'grade4Geometry.angles.feedback.selectAllRight',
  };
}

function makeCompareRayLengthChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4AngleChallenge {
  const degrees = pickClassifiableDegrees(random, pickRandom(random, ['acute', 'obtuse'] as const));
  const scene = buildAngleScene(random, difficulty, degrees);
  const claimIsTrueVersion = random() < 0.5;
  return {
    id: `geo4-angles-misconception-${difficulty}-${index}`,
    kind: 'compareRayLength',
    difficulty,
    scene,
    promptKey: claimIsTrueVersion ? 'grade4Geometry.angles.prompt.misconceptionTrue' : 'grade4Geometry.angles.prompt.misconceptionFalse',
    answer: claimIsTrueVersion ? 'true' : 'false',
    options: ['true', 'false'],
    feedbackKey: 'grade4Geometry.angles.feedback.misconception',
  };
}

function makeChallenge(difficulty: Geo4DifficultyId, kind: Geo4AngleKind, index: number, random: () => number): Geo4AngleChallenge {
  switch (kind) {
    case 'tapVertexOrArm':
      return makeTapVertexOrArmChallenge(difficulty, index, random);
    case 'classifyType':
      return makeClassifyTypeChallenge(difficulty, index, random);
    case 'selectAllRight':
      return makeSelectAllRightChallenge(difficulty, index, random);
    case 'compareRayLength':
      return makeCompareRayLengthChallenge(difficulty, index, random);
    default:
      throw new Error(`grade4GeoAnglesData: unhandled kind "${kind satisfies never}"`);
  }
}

export function assertGeo4AngleChallengeIsSound(challenge: Geo4AngleChallenge): void {
  if (challenge.options.filter((o) => o === challenge.answer).length !== 1) {
    throw new Error(`geo4-angles "${challenge.kind}": question must encode exactly one correct answer`);
  }
  if (challenge.kind === 'classifyType' && challenge.scene) {
    const degrees = angleBetweenRays(challenge.scene.vertex.point, challenge.scene.rays[0].through, challenge.scene.rays[1].through);
    if (classifyAngle7(degrees) !== challenge.answer) throw new Error('classifyType answer disagrees with the scene\'s real angle measure');
    if (!isUnambiguouslyClassifiable(degrees)) throw new Error('classifyType angle is too close to a classification boundary to be fair');
  }
  if (challenge.kind === 'selectAllRight' && challenge.gallery) {
    const expected = challenge.gallery
      .filter((g) => g.isRight)
      .map((g) => g.id)
      .sort()
      .join(',');
    if (challenge.answer !== expected) throw new Error('selectAllRight answer must be exactly the set of right-angle gallery items');
    for (const item of challenge.gallery) {
      const degrees = angleBetweenRays(item.scene.vertex.point, item.scene.rays[0].through, item.scene.rays[1].through);
      if (item.isRight !== (classifyAngle7(degrees) === 'right')) throw new Error('gallery item\'s isRight flag disagrees with its actual angle measure');
    }
  }
}

export interface Geo4AnglesTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildGeo4AnglesQuestions({ difficultyId, count, seed }: Geo4AnglesTrainingInput): TrainingQuestion<Geo4AngleChallenge>[] {
  const difficulty: Geo4DifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KIND_POOL[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, kinds[index % kinds.length], index, random);
    assertGeo4AngleChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const GEO4_ANGLES_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 8, 12],
  defaultQuestionCount: 8,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'grade4Geometry.angles.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'grade4Geometry.angles.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'grade4Geometry.angles.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: GEO4_ANGLES_RULES_VERSION,
};

export const geo4AnglesActivity: TrainingActivityDefinition<Geo4AngleChallenge> = {
  id: 'geo4Angles',
  i18nPrefix: 'grade4Geometry.angles',
  capabilities: GEO4_ANGLES_CAPABILITIES,
  generateQuestions: buildGeo4AnglesQuestions,
};
