import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { AngleIdentifyChallenge, AngleIdentifyKind, AnglesDifficultyId } from '../../types/anglesGrade7';
import type { AngleRef } from '../../geometry/types';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import { buildVertexScene, pickLabels, pickSpreadDegrees, randomBaseRotation } from './anglesGrade7Shared';

/**
 * Skill A (textbook-sourced — chapter 20, עמ' 227–232): rays, the vertex, and
 * the angle as a union of two rays. Three interaction kinds, all grounded in
 * one shared `VertexScene`:
 *  - `vertex`: tap the point that is the angle's vertex.
 *  - `rays`: pick, from text options, which two rays bound a highlighted arc.
 *  - `angle`: several angles are drawn at once at a shared vertex (the
 *    ∠BAC/∠BAD/∠CAD idea from chapter 21) — tap the one matching the prompt.
 */
export const ANGLES_IDENTIFY_RULES_VERSION = 1;

const RAY_COUNT_BY_DIFFICULTY: Record<AnglesDifficultyId, number> = {
  basic: 3,
  intermediate: 4,
  advanced: 5,
};

const KIND_POOL: Record<AnglesDifficultyId, AngleIdentifyKind[]> = {
  basic: ['vertex', 'vertex', 'rays', 'vertex'],
  intermediate: ['vertex', 'rays', 'rays', 'angle'],
  advanced: ['rays', 'angle', 'angle', 'vertex'],
};

function makeVertexChallenge(
  difficulty: AnglesDifficultyId,
  index: number,
  random: () => number,
): AngleIdentifyChallenge {
  const rayCount = RAY_COUNT_BY_DIFFICULTY[difficulty];
  const [vertexLabel, ...armLabels] = pickLabels(random, rayCount + 1);
  const degrees = pickSpreadDegrees(random, rayCount);
  const scene = buildVertexScene(random, vertexLabel, degrees, armLabels, {
    baseRotationDeg: randomBaseRotation(random, difficulty),
  });
  const pointOptionIds = shuffle(['vertex', ...scene.rays.map((ray) => ray.id)], random);
  return {
    id: `angles-identify-vertex-${difficulty}-${index}`,
    kind: 'vertex',
    difficulty,
    scene,
    promptKey: 'anglesGrade7.identify.prompt.vertex',
    pointOptionIds,
    answer: 'vertex',
    options: pointOptionIds,
    feedbackKey: 'anglesGrade7.identify.feedback.vertex',
  };
}

function makeRaysChallenge(
  difficulty: AnglesDifficultyId,
  index: number,
  random: () => number,
): AngleIdentifyChallenge {
  const rayCount = RAY_COUNT_BY_DIFFICULTY[difficulty];
  const [vertexLabel, ...armLabels] = pickLabels(random, rayCount + 1);
  const degrees = pickSpreadDegrees(random, rayCount);
  const scene = buildVertexScene(random, vertexLabel, degrees, armLabels, {
    baseRotationDeg: randomBaseRotation(random, difficulty),
  });

  // The highlighted angle is always between two *adjacent* rays, so the
  // highlighted arc on screen unambiguously corresponds to exactly one pair.
  const pairIndex = randomInt(random, 0, scene.rays.length - 2);
  const correctPair: [string, string] = [scene.rays[pairIndex].id, scene.rays[pairIndex + 1].id];
  const correctLabels: [string, string] = [scene.rays[pairIndex].label, scene.rays[pairIndex + 1].label];

  const distractorPairs: { rayIds: [string, string]; labels: [string, string] }[] = [];
  for (let i = 0; i < scene.rays.length; i += 1) {
    for (let j = i + 1; j < scene.rays.length; j += 1) {
      if (i === pairIndex && j === pairIndex + 1) continue;
      distractorPairs.push({
        rayIds: [scene.rays[i].id, scene.rays[j].id],
        labels: [scene.rays[i].label, scene.rays[j].label],
      });
    }
  }
  const chosenDistractors = shuffle(distractorPairs, random).slice(0, 3);
  const allOptions = shuffle(
    [
      { id: 'pair-correct', rayIds: correctPair, labels: correctLabels },
      ...chosenDistractors.map((pair, i) => ({ id: `pair-${i}`, rayIds: pair.rayIds, labels: pair.labels })),
    ],
    random,
  );

  const highlightedRef: AngleRef = { vertexId: 'vertex', rayAId: correctPair[0], rayBId: correctPair[1] };

  return {
    id: `angles-identify-rays-${difficulty}-${index}`,
    kind: 'rays',
    difficulty,
    scene,
    promptKey: 'anglesGrade7.identify.prompt.rays',
    angleOptions: [{ id: 'highlighted', ref: highlightedRef }],
    rayPairOptions: allOptions,
    answer: 'pair-correct',
    options: allOptions.map((option) => option.id),
    feedbackKey: 'anglesGrade7.identify.feedback.rays',
  };
}

function makeAngleChallenge(
  difficulty: AnglesDifficultyId,
  index: number,
  random: () => number,
): AngleIdentifyChallenge {
  // Three rays is enough to give three genuinely distinct simultaneous
  // angles without the diagram becoming unreadable.
  const [vertexLabel, ...armLabels] = pickLabels(random, 4);
  const degrees = pickSpreadDegrees(random, 3, 22, 140);
  const scene = buildVertexScene(random, vertexLabel, degrees, armLabels, {
    baseRotationDeg: randomBaseRotation(random, difficulty),
  });
  const [rayA, rayB, rayC] = scene.rays;
  const angleOptions = [
    { id: 'ang-0', ref: { vertexId: 'vertex', rayAId: rayA.id, rayBId: rayB.id } },
    { id: 'ang-1', ref: { vertexId: 'vertex', rayAId: rayB.id, rayBId: rayC.id } },
    { id: 'ang-2', ref: { vertexId: 'vertex', rayAId: rayA.id, rayBId: rayC.id } },
  ];
  const target = pickRandom(random, angleOptions);
  const targetRay = (id: string) => scene.rays.find((ray) => ray.id === id)!;
  const requestedName = `${targetRay(target.ref.rayAId).label}${vertexLabel}${targetRay(target.ref.rayBId).label}`;

  return {
    id: `angles-identify-angle-${difficulty}-${index}`,
    kind: 'angle',
    difficulty,
    scene,
    promptKey: 'anglesGrade7.identify.prompt.angle',
    promptValues: { name: requestedName },
    angleOptions,
    answer: target.id,
    options: angleOptions.map((option) => option.id),
    feedbackKey: 'anglesGrade7.identify.feedback.angle',
  };
}

function makeChallenge(difficulty: AnglesDifficultyId, kind: AngleIdentifyKind, index: number, random: () => number): AngleIdentifyChallenge {
  if (kind === 'vertex') return makeVertexChallenge(difficulty, index, random);
  if (kind === 'rays') return makeRaysChallenge(difficulty, index, random);
  return makeAngleChallenge(difficulty, index, random);
}

/** Programmatic soundness check, used by every generated challenge and exercised directly by tests across many seeds. */
export function assertAngleIdentifyChallengeIsSound(challenge: AngleIdentifyChallenge): void {
  if (new Set(challenge.options).size !== challenge.options.length) throw new Error('duplicate options');
  if (challenge.options.filter((option) => option === challenge.answer).length !== 1) {
    throw new Error('question must contain exactly one correct answer');
  }
  if (challenge.kind === 'vertex' && !challenge.pointOptionIds?.includes('vertex')) {
    throw new Error('vertex kind must offer the real vertex as one of its candidate points');
  }
  if (challenge.kind === 'rays') {
    const correct = challenge.rayPairOptions?.find((option) => option.id === challenge.answer);
    if (!correct) throw new Error('rays kind must resolve its answer to one of the offered pairs');
  }
}

export interface AnglesIdentifyTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildAnglesIdentifyQuestions({
  difficultyId,
  count,
  seed,
}: AnglesIdentifyTrainingInput): TrainingQuestion<AngleIdentifyChallenge>[] {
  const difficulty: AnglesDifficultyId =
    difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KIND_POOL[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, kinds[index % kinds.length], index, random);
    assertAngleIdentifyChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const ANGLES_IDENTIFY_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 10, 15],
  defaultQuestionCount: 10,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'anglesGrade7.identify.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'anglesGrade7.identify.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'anglesGrade7.identify.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: ANGLES_IDENTIFY_RULES_VERSION,
};

export const anglesIdentifyActivity: TrainingActivityDefinition<AngleIdentifyChallenge> = {
  id: 'anglesIdentify',
  i18nPrefix: 'anglesGrade7.identify',
  capabilities: ANGLES_IDENTIFY_CAPABILITIES,
  generateQuestions: buildAnglesIdentifyQuestions,
};
