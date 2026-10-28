import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { AngleNotationChallenge, AngleNotationKind, AnglesDifficultyId } from '../../types/anglesGrade7';
import type { LabeledTriangle } from '../../geometry/types';
import {
  allValidThreeLetterNames,
  canUseVertexOnlyName,
  greekLetterForIndex,
  isValidAngleName,
  threeLetterName,
} from '../../geometry/angleNotation';
import { interiorAngleArmLabels, isValidTriangle } from '../../geometry/polygon';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import { buildVertexScene, pickLabels, pickSpreadDegrees, randomBaseRotation, STAGE_CENTER } from './anglesGrade7Shared';
import { pointFromAngle } from '../../geometry/angleMath';

/**
 * Skill D (textbook-sourced — chapter 21, עמ' 233–238): the three-letter
 * angle name (middle letter always the vertex), name equivalence, and the
 * Greek-letter shorthand. `triangleInterior` is a light Skill-E *enrichment*
 * — not present in the source excerpt — that reuses this exact notation
 * skill to name one interior angle of a labeled triangle, rather than
 * inventing any new polygon-angle theorem.
 */
export const ANGLES_NOTATION_RULES_VERSION = 1;

const RAY_COUNT_BY_DIFFICULTY: Record<AnglesDifficultyId, number> = {
  basic: 2,
  intermediate: 3,
  advanced: 4,
};

// Index 0 of every pool is deliberately kept as a plain single-select kind
// ('selectName'): the first question of a session is what a handful of
// existing page tests interact with directly, and only a single-select
// question answers immediately on one button click.
const KIND_POOL: Record<AnglesDifficultyId, AngleNotationKind[]> = {
  basic: ['selectName', 'selectAllNames', 'selectName', 'selectInvalid'],
  intermediate: ['selectName', 'selectInvalid', 'selectAllNames', 'triangleInterior'],
  advanced: ['selectInvalid', 'triangleInterior', 'selectAllNames', 'selectName'],
};

const GREEK_CHANCE_BY_DIFFICULTY: Record<AnglesDifficultyId, number> = { basic: 0, intermediate: 0.35, advanced: 0.5 };

/**
 * Three distractor names that are guaranteed distinct from each other, from
 * `correct`, and from the *other* valid ordering of the same angle — proven
 * by construction (see the generator's design notes), not by a runtime
 * dedupe loop:
 *  - `variantA`/`variantB`: the classic "wrong letter in the middle" mistake,
 *    in both possible wrong positions.
 *  - `variantC`: one real letter replaced by an unrelated point's label.
 */
function nameDistractors(vertexLabel: string, armLabels: readonly [string, string], unrelatedLabel: string): [string, string, string] {
  const [armA, armB] = armLabels;
  const variantA = threeLetterName(vertexLabel, armA, armB);
  const variantB = threeLetterName(armA, armB, vertexLabel);
  const variantC = threeLetterName(unrelatedLabel, vertexLabel, armB);
  return [variantA, variantB, variantC];
}

function makeSelectNameChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleNotationChallenge {
  const rayCount = RAY_COUNT_BY_DIFFICULTY[difficulty];
  const labels = pickLabels(random, rayCount + 2); // vertex + rayCount arms + 1 spare unrelated label
  const [vertexLabel, ...rest] = labels;
  const armLabels = rest.slice(0, rayCount);
  const unrelatedLabel = rest[rayCount];
  const degrees = pickSpreadDegrees(random, rayCount);
  const scene = buildVertexScene(random, vertexLabel, degrees, armLabels, { baseRotationDeg: randomBaseRotation(random, difficulty) });

  const pairIndex = rayCount === 2 ? 0 : randomInt(random, 0, rayCount - 2);
  const armPair: [string, string] = [scene.rays[pairIndex].label, scene.rays[pairIndex + 1].label];
  const correct = pickRandom(random, allValidThreeLetterNames(vertexLabel, armPair));
  const [variantA, variantB, variantC] = nameDistractors(vertexLabel, armPair, unrelatedLabel);
  const options = shuffle([correct, variantA, variantB, variantC], random);

  const usesGreekLetter = random() < GREEK_CHANCE_BY_DIFFICULTY[difficulty];
  const greekLetter = usesGreekLetter ? (greekLetterForIndex(index % 4) ?? 'α') : undefined;

  return {
    id: `angles-notation-select-${difficulty}-${index}`,
    kind: 'selectName',
    difficulty,
    scene,
    highlightedRef: { vertexId: 'vertex', rayAId: scene.rays[pairIndex].id, rayBId: scene.rays[pairIndex + 1].id },
    usesGreekLetter,
    promptKey: usesGreekLetter ? 'anglesGrade7.notation.prompt.selectNameGreek' : 'anglesGrade7.notation.prompt.selectName',
    promptValues: usesGreekLetter ? { letter: greekLetter! } : undefined,
    answer: correct,
    options,
    feedbackKey: 'anglesGrade7.notation.feedback.selectName',
  };
}

function makeSelectInvalidChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleNotationChallenge {
  const rayCount = RAY_COUNT_BY_DIFFICULTY[difficulty];
  const labels = pickLabels(random, rayCount + 1);
  const [vertexLabel, ...armLabels] = labels;
  const degrees = pickSpreadDegrees(random, rayCount);
  const scene = buildVertexScene(random, vertexLabel, degrees, armLabels, { baseRotationDeg: randomBaseRotation(random, difficulty) });

  const pairIndex = rayCount === 2 ? 0 : randomInt(random, 0, rayCount - 2);
  const armPair: [string, string] = [scene.rays[pairIndex].label, scene.rays[pairIndex + 1].label];
  const [validA, validB] = allValidThreeLetterNames(vertexLabel, armPair);
  const invalid = threeLetterName(vertexLabel, armPair[0], armPair[1]); // the classic wrong-vertex mistake
  const options = shuffle([validA, validB, invalid], random);

  return {
    id: `angles-notation-invalid-${difficulty}-${index}`,
    kind: 'selectInvalid',
    difficulty,
    scene,
    highlightedRef: { vertexId: 'vertex', rayAId: scene.rays[pairIndex].id, rayBId: scene.rays[pairIndex + 1].id },
    promptKey: 'anglesGrade7.notation.prompt.selectInvalid',
    answer: invalid,
    options,
    feedbackKey: 'anglesGrade7.notation.feedback.selectInvalid',
  };
}

function makeTriangleInteriorChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleNotationChallenge {
  const [a, b, c] = pickLabels(random, 3);
  const unrelatedLabel = pickLabels(random, 1, [a, b, c])[0];

  // A triangle built from a vertex + two other points at a safe angular
  // spread and distance, re-validated with the Grade 3 geometry unit's own
  // `isValidTriangle` so a degenerate (near-collinear) triangle is never shown.
  let triangle: LabeledTriangle | null = null;
  for (let attempt = 0; attempt < 30 && !triangle; attempt += 1) {
    const baseRotation = randomBaseRotation(random, difficulty);
    const degB = 20 + randomInt(random, 0, 60);
    const degC = 120 + randomInt(random, 0, 50);
    const p0 = STAGE_CENTER;
    const p1 = pointFromAngle(STAGE_CENTER, degB + baseRotation, 110 + randomInt(random, 0, 30));
    const p2 = pointFromAngle(STAGE_CENTER, degC + baseRotation, 110 + randomInt(random, 0, 30));
    const candidate: LabeledTriangle = {
      vertices: [
        { id: 'tri-0', label: a, point: p0 },
        { id: 'tri-1', label: b, point: p1 },
        { id: 'tri-2', label: c, point: p2 },
      ],
    };
    if (isValidTriangle([p0, p1, p2])) triangle = candidate;
  }
  if (!triangle) {
    // Deterministic fallback shape, always a valid triangle — the retry loop above is never expected to exhaust in practice.
    triangle = {
      vertices: [
        { id: 'tri-0', label: a, point: STAGE_CENTER },
        { id: 'tri-1', label: b, point: { x: STAGE_CENTER.x + 110, y: STAGE_CENTER.y } },
        { id: 'tri-2', label: c, point: { x: STAGE_CENTER.x + 40, y: STAGE_CENTER.y - 100 } },
      ],
    };
  }

  const vertexIndex = randomInt(random, 0, 2) as 0 | 1 | 2;
  const vertexLabel = triangle.vertices[vertexIndex].label;
  const armPair = interiorAngleArmLabels(triangle, vertexIndex);
  const correct = pickRandom(random, allValidThreeLetterNames(vertexLabel, armPair));
  const [variantA, variantB, variantC] = nameDistractors(vertexLabel, armPair, unrelatedLabel);
  const options = shuffle([correct, variantA, variantB, variantC], random);

  return {
    id: `angles-notation-triangle-${difficulty}-${index}`,
    kind: 'triangleInterior',
    difficulty,
    triangle,
    highlightedVertexIndex: vertexIndex,
    promptKey: 'anglesGrade7.notation.prompt.triangleInterior',
    promptValues: { vertex: vertexLabel },
    answer: correct,
    options,
    feedbackKey: 'anglesGrade7.notation.feedback.triangleInterior',
  };
}

/**
 * Scene ray counts a `selectAllNames` question draws from, per difficulty.
 * Basic occasionally uses just 2 rays — the *only* scene shape where
 * `canUseVertexOnlyName` is true (exactly one angle exists at the vertex), so
 * it is the sole mechanism that ever produces a 3-correct-name question (the
 * two letter orderings plus the unambiguous vertex-only name). With 3+ rays
 * at the vertex a vertex-only name is always ambiguous, so only the two
 * orderings are ever valid — this is a deliberate, reasoned reading of the
 * textbook's "2 or 3 correct names" variation against what this engine's
 * one-label-per-ray model can actually produce; see the final report.
 */
const SELECT_ALL_RAY_COUNT_OPTIONS: Record<AnglesDifficultyId, number[]> = {
  basic: [2, 3, 3],
  intermediate: [3, 4, 4],
  advanced: [4, 5, 5],
};

/** Total options offered (correct + distractors) — always achievable; see the generator's design notes on distractor-pool size. */
const SELECT_ALL_TOTAL_OPTIONS = 5;

function makeSelectAllNamesChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleNotationChallenge {
  const rayCount = pickRandom(random, SELECT_ALL_RAY_COUNT_OPTIONS[difficulty]);
  const labels = pickLabels(random, rayCount + 2); // vertex + rayCount arms + 1 spare unrelated label
  const [vertexLabel, ...rest] = labels;
  const armLabels = rest.slice(0, rayCount);
  const unrelatedLabel = rest[rayCount];
  const degrees = pickSpreadDegrees(random, rayCount);
  const scene = buildVertexScene(random, vertexLabel, degrees, armLabels, { baseRotationDeg: randomBaseRotation(random, difficulty) });

  const pairIndex = rayCount === 2 ? 0 : randomInt(random, 0, rayCount - 2);
  const armPair: [string, string] = [scene.rays[pairIndex].label, scene.rays[pairIndex + 1].label];
  const [orderingA, orderingB] = allValidThreeLetterNames(vertexLabel, armPair);

  const correctNames = [orderingA, orderingB];
  if (canUseVertexOnlyName(rayCount)) correctNames.push(vertexLabel);

  // Distractor pool: the classic wrong-vertex mistake (both slots), a point
  // not in this diagram at all, and — the genuinely tricky one — a real
  // *other* ray in the scene swapped in for one arm, which looks exactly
  // like a valid name's shape but actually names a different angle.
  const otherRays = scene.rays.filter((_, i) => i !== pairIndex && i !== pairIndex + 1);
  const distractorPool = new Set<string>([
    threeLetterName(vertexLabel, armPair[0], armPair[1]),
    threeLetterName(armPair[0], armPair[1], vertexLabel),
    threeLetterName(unrelatedLabel, vertexLabel, armPair[1]),
  ]);
  for (const otherRay of otherRays) {
    distractorPool.add(threeLetterName(armPair[0], vertexLabel, otherRay.label));
    distractorPool.add(threeLetterName(otherRay.label, vertexLabel, armPair[1]));
  }
  // Defensive, not merely trusted: a "distractor" that is secretly a valid
  // name (or literally the vertex-only name) would make the question unsound.
  for (const candidate of [...distractorPool]) {
    if (candidate === vertexLabel || isValidAngleName(candidate, vertexLabel, armPair)) distractorPool.delete(candidate);
  }

  const neededDistractors = Math.max(0, SELECT_ALL_TOTAL_OPTIONS - correctNames.length);
  const distractors = shuffle([...distractorPool], random).slice(0, neededDistractors);

  const combined = [
    ...correctNames.map((name, i) => ({ id: `correct-${i}`, name, valid: true })),
    ...distractors.map((name, i) => ({ id: `distractor-${i}`, name, valid: false })),
  ];
  const nameOptions = shuffle(combined, random);
  const correctOptionIds = nameOptions
    .filter((option) => option.valid)
    .map((option) => option.id)
    .sort();
  const answer = correctOptionIds.join(',');

  return {
    id: `angles-notation-selectall-${difficulty}-${index}`,
    kind: 'selectAllNames',
    difficulty,
    scene,
    highlightedRef: { vertexId: 'vertex', rayAId: scene.rays[pairIndex].id, rayBId: scene.rays[pairIndex + 1].id },
    nameOptions,
    promptKey: 'anglesGrade7.notation.prompt.selectAllNames',
    answer,
    options: [answer],
    feedbackKey: 'anglesGrade7.notation.feedback.selectAllNames',
  };
}

function makeChallenge(difficulty: AnglesDifficultyId, kind: AngleNotationKind, index: number, random: () => number): AngleNotationChallenge {
  if (kind === 'selectName') return makeSelectNameChallenge(difficulty, index, random);
  if (kind === 'selectInvalid') return makeSelectInvalidChallenge(difficulty, index, random);
  if (kind === 'selectAllNames') return makeSelectAllNamesChallenge(difficulty, index, random);
  return makeTriangleInteriorChallenge(difficulty, index, random);
}

export function assertAngleNotationChallengeIsSound(challenge: AngleNotationChallenge): void {
  if (new Set(challenge.options).size !== challenge.options.length) throw new Error('duplicate name options');
  if (challenge.options.filter((option) => option === challenge.answer).length !== 1) {
    throw new Error('question must have exactly one correct name');
  }

  if (challenge.kind === 'selectName' || challenge.kind === 'selectInvalid') {
    const ref = challenge.highlightedRef!;
    const rayA = challenge.scene!.rays.find((ray) => ray.id === ref.rayAId)!;
    const rayB = challenge.scene!.rays.find((ray) => ray.id === ref.rayBId)!;
    const vertexLabel = challenge.scene!.vertex.label;
    const armLabels: [string, string] = [rayA.label, rayB.label];
    if (challenge.kind === 'selectName') {
      if (!isValidAngleName(challenge.answer, vertexLabel, armLabels)) {
        throw new Error(`selectName answer "${challenge.answer}" is not actually a valid name for ∠${armLabels[0]}${vertexLabel}${armLabels[1]}`);
      }
      for (const option of challenge.options) {
        if (option !== challenge.answer && isValidAngleName(option, vertexLabel, armLabels)) {
          throw new Error(`selectName distractor "${option}" is also a valid name — the question is not well-posed`);
        }
      }
    } else {
      if (isValidAngleName(challenge.answer, vertexLabel, armLabels)) {
        throw new Error(`selectInvalid answer "${challenge.answer}" is actually a valid name — the question is not well-posed`);
      }
      for (const option of challenge.options) {
        if (option !== challenge.answer && !isValidAngleName(option, vertexLabel, armLabels)) {
          throw new Error(`selectInvalid distractor "${option}" is also invalid — the question is not well-posed`);
        }
      }
    }
  }

  if (challenge.kind === 'triangleInterior') {
    const vertexLabel = challenge.triangle!.vertices[challenge.highlightedVertexIndex!].label;
    const armLabels = interiorAngleArmLabels(challenge.triangle!, challenge.highlightedVertexIndex!);
    if (!isValidAngleName(challenge.answer, vertexLabel, armLabels)) {
      throw new Error('triangleInterior answer is not a valid name for the highlighted interior angle');
    }
  }

  if (challenge.kind === 'selectAllNames') {
    const options = challenge.nameOptions!;
    if (options.length < 4) throw new Error('selectAllNames needs at least 4 options');
    const names = options.map((option) => option.name);
    if (new Set(names).size !== names.length) throw new Error('selectAllNames has duplicate name options');

    const ref = challenge.highlightedRef!;
    const rayA = challenge.scene!.rays.find((ray) => ray.id === ref.rayAId)!;
    const rayB = challenge.scene!.rays.find((ray) => ref.rayBId === ray.id)!;
    const vertexLabel = challenge.scene!.vertex.label;
    const armLabels: [string, string] = [rayA.label, rayB.label];
    const rayCountAtVertex = challenge.scene!.rays.length;
    const vertexOnlyUnambiguous = canUseVertexOnlyName(rayCountAtVertex);

    const correctIds: string[] = [];
    for (const option of options) {
      const isVertexOnlyName = option.name === vertexLabel;
      const actuallyValid = isVertexOnlyName ? vertexOnlyUnambiguous : isValidAngleName(option.name, vertexLabel, armLabels);
      if (actuallyValid !== option.valid) {
        throw new Error(`selectAllNames option "${option.name}" is marked valid=${option.valid} but is actually ${actuallyValid}`);
      }
      if (option.valid) correctIds.push(option.id);
    }
    if (correctIds.length < 2) throw new Error('selectAllNames must have at least two correct names (both letter orders)');
    const expectedAnswer = [...correctIds].sort().join(',');
    if (challenge.answer !== expectedAnswer) {
      throw new Error('selectAllNames answer does not match the sorted-and-joined set of correct option ids');
    }
  }
}

export interface AnglesNotationTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildAnglesNotationQuestions({ difficultyId, count, seed }: AnglesNotationTrainingInput): TrainingQuestion<AngleNotationChallenge>[] {
  const difficulty: AnglesDifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KIND_POOL[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, kinds[index % kinds.length], index, random);
    assertAngleNotationChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const ANGLES_NOTATION_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 10, 15],
  defaultQuestionCount: 10,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'anglesGrade7.notation.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'anglesGrade7.notation.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'anglesGrade7.notation.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: ANGLES_NOTATION_RULES_VERSION,
};

export const anglesNotationActivity: TrainingActivityDefinition<AngleNotationChallenge> = {
  id: 'anglesNotation',
  i18nPrefix: 'anglesGrade7.notation',
  capabilities: ANGLES_NOTATION_CAPABILITIES,
  generateQuestions: buildAnglesNotationQuestions,
};
