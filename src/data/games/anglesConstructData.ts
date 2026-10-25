import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { AngleConstructChallenge, AnglesDifficultyId } from '../../types/anglesGrade7';
import type { AngleType7 } from '../../geometry/types';
import { CLASSIFICATION_SAFETY_MARGIN_DEG, classifyAngle7, pointFromAngle } from '../../geometry/angleMath';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { randomBaseRotation, STAGE_CENTER } from './anglesGrade7Shared';

/**
 * Skill C — a construct-an-angle drag lab. The textbook excerpt only
 * *gestures* at construction (the paper-folding right-angle method, "draw 3
 * points forming an acute/straight angle"); the interactive drag mechanic
 * itself is this build's own addition, inspired by but not identical to a
 * print-book exercise — called out explicitly in the final report per the
 * mission brief.
 *
 * Grading happens in two steps, split deliberately across layers: this
 * generator only decides *what* to ask for (a type, or — at the advanced
 * tier — a specific measure) and a tolerance; the page component (which owns
 * the live drag state) measures the angle the child actually built and
 * reports the result back through the same `submit(answer: string)` contract
 * every other activity uses.
 */
export const ANGLES_CONSTRUCT_RULES_VERSION = 1;

const ACUTE_RANGE = { min: CLASSIFICATION_SAFETY_MARGIN_DEG, max: 90 - CLASSIFICATION_SAFETY_MARGIN_DEG };
const OBTUSE_RANGE = { min: 90 + CLASSIFICATION_SAFETY_MARGIN_DEG, max: 180 - CLASSIFICATION_SAFETY_MARGIN_DEG };
const TYPES: AngleType7[] = ['acute', 'right', 'obtuse', 'straight'];

/** How far (degrees) the draggable ray starts from the fixed ray — always far enough that real dragging is required, never already "basically there". */
const INITIAL_OFFSET_RANGE: Record<AnglesDifficultyId, { min: number; max: number }> = {
  basic: { min: 35, max: 70 },
  intermediate: { min: 30, max: 80 },
  advanced: { min: 25, max: 90 },
};

function makeChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleConstructChallenge {
  const vertex = STAGE_CENTER;
  const baseRotation = randomBaseRotation(random, difficulty);
  const fixedThrough = pointFromAngle(vertex, baseRotation, 100);

  const useExactDegree = difficulty === 'advanced' && random() < 0.5;

  let targetType: AngleType7;
  let targetDegrees: number | undefined;
  let toleranceDeg: number;
  let answer: string;
  let promptKey: string;
  let promptValues: Record<string, string> | undefined;

  if (useExactDegree) {
    const candidates = [
      randomInt(random, ACUTE_RANGE.min, ACUTE_RANGE.max),
      randomInt(random, OBTUSE_RANGE.min, OBTUSE_RANGE.max),
    ];
    targetDegrees = pickRandom(random, candidates);
    targetType = classifyAngle7(targetDegrees);
    toleranceDeg = 6;
    answer = String(targetDegrees);
    promptKey = 'anglesGrade7.construct.prompt.degrees';
    promptValues = { degrees: String(targetDegrees) };
  } else {
    targetType = pickRandom(random, TYPES);
    toleranceDeg = CLASSIFICATION_SAFETY_MARGIN_DEG;
    answer = targetType;
    promptKey = `anglesGrade7.construct.prompt.type.${targetType}`;
  }

  const offsetRange = INITIAL_OFFSET_RANGE[difficulty];
  let offsetMagnitude = randomInt(random, offsetRange.min, offsetRange.max);
  // In degree-target mode, the start position must not land within the
  // acceptance tolerance of the exact target by pure chance — guarantee a
  // safe distance rather than merely nudging (a nudge could itself land
  // close to a *different* boundary, so this recomputes outright).
  const safeGap = toleranceDeg + 15;
  if (targetDegrees !== undefined && Math.abs(offsetMagnitude - targetDegrees) < safeGap) {
    offsetMagnitude = targetDegrees >= 90 ? Math.max(10, targetDegrees - safeGap) : Math.min(170, targetDegrees + safeGap);
  }
  const offset = offsetMagnitude * (random() < 0.5 ? -1 : 1);
  const startDraggableThrough = pointFromAngle(vertex, baseRotation + offset, 90);

  return {
    id: `angles-construct-${difficulty}-${index}`,
    kind: 'construct',
    difficulty,
    vertex,
    fixedThrough,
    startDraggableThrough,
    targetType,
    targetDegrees,
    toleranceDeg,
    answer,
    options: [answer],
    promptKey,
    promptValues,
    feedbackKey: useExactDegree ? 'anglesGrade7.construct.feedback.degrees' : `anglesGrade7.construct.feedback.type.${targetType}`,
  };
}

export function assertAngleConstructChallengeIsSound(challenge: AngleConstructChallenge): void {
  if (challenge.options.filter((option) => option === challenge.answer).length !== 1) {
    throw new Error('construct question must have exactly one correct answer encoded');
  }
  if (challenge.targetDegrees !== undefined) {
    if (classifyAngle7(challenge.targetDegrees) !== challenge.targetType) {
      throw new Error('construct target degrees disagree with the stored target type');
    }
    if (String(challenge.targetDegrees) !== challenge.answer) {
      throw new Error('construct answer must equal the target degrees as a string in degree-target mode');
    }
  } else if (challenge.answer !== challenge.targetType) {
    throw new Error('construct answer must equal the target type in type-target mode');
  }
  // The start position must require real dragging — never already at the target.
  const startDeg = Math.atan2(
    challenge.startDraggableThrough.y - challenge.vertex.y,
    challenge.startDraggableThrough.x - challenge.vertex.x,
  );
  const fixedDeg = Math.atan2(challenge.fixedThrough.y - challenge.vertex.y, challenge.fixedThrough.x - challenge.vertex.x);
  const rawDiff = Math.abs(((startDeg - fixedDeg) * 180) / Math.PI);
  const startAngle = rawDiff > 180 ? 360 - rawDiff : rawDiff;
  if (challenge.targetDegrees !== undefined && Math.abs(startAngle - challenge.targetDegrees) < challenge.toleranceDeg) {
    throw new Error('construct challenge starts too close to the exact target — no real dragging required');
  }
}

export interface AnglesConstructTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildAnglesConstructQuestions({ difficultyId, count, seed }: AnglesConstructTrainingInput): TrainingQuestion<AngleConstructChallenge>[] {
  const difficulty: AnglesDifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, index, random);
    assertAngleConstructChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const ANGLES_CONSTRUCT_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [3, 5, 8],
  defaultQuestionCount: 5,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'anglesGrade7.construct.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'anglesGrade7.construct.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'anglesGrade7.construct.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: ANGLES_CONSTRUCT_RULES_VERSION,
};

export const anglesConstructActivity: TrainingActivityDefinition<AngleConstructChallenge> = {
  id: 'anglesConstruct',
  i18nPrefix: 'anglesGrade7.construct',
  capabilities: ANGLES_CONSTRUCT_CAPABILITIES,
  generateQuestions: buildAnglesConstructQuestions,
};
