import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { AngleCompareChallenge, AngleCompareSide, AnglesDifficultyId } from '../../types/anglesGrade7';
import { createSeededRandom, randomInt } from '../../utils/seededRandom';
import { buildVertexScene, pickLabels, randomBaseRotation } from './anglesGrade7Shared';

/**
 * Chapter 22 (textbook-sourced, עמ' 239): comparing two angles' sizes with
 * </=/>. Directly tests the misconception the textbook calls out by name:
 * ray length must never be usable as a size cue. The engine already
 * guarantees this structurally (every ray is always drawn at one fixed
 * on-screen length, see `components/geometry`), so this generator goes
 * further and deliberately *randomizes* each side's underlying ray-drawn
 * distance and rotation to prove the guarantee holds even under variation —
 * exactly the textbook's own "can you tell without measuring?" framing.
 */
export const ANGLES_COMPARE_RULES_VERSION = 1;

/** Minimum gap (degrees) between the two angles when they are NOT the deliberate equal case — smaller at harder tiers, which is the reasoning-load knob here. */
const MIN_GAP_BY_DIFFICULTY: Record<AnglesDifficultyId, number> = { basic: 25, intermediate: 14, advanced: 7 };
const EQUAL_CHANCE_BY_DIFFICULTY: Record<AnglesDifficultyId, number> = { basic: 0.15, intermediate: 0.2, advanced: 0.25 };

function buildSide(random: () => number, vertexLabel: string, armLabels: [string, string], degrees: number, difficulty: AnglesDifficultyId): AngleCompareSide {
  const scene = buildVertexScene(random, vertexLabel, [0, degrees], armLabels, { baseRotationDeg: randomBaseRotation(random, difficulty) });
  return { scene, ref: { vertexId: 'vertex', rayAId: scene.rays[0].id, rayBId: scene.rays[1].id }, degrees };
}

function makeChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleCompareChallenge {
  const labels = pickLabels(random, 6);
  const leftVertex = labels[0];
  const leftArms: [string, string] = [labels[1], labels[2]];
  const rightVertex = labels[3];
  const rightArms: [string, string] = [labels[4], labels[5]];

  const leftDegrees = randomInt(random, 15, 165);
  const isEqual = random() < EQUAL_CHANCE_BY_DIFFICULTY[difficulty];
  let rightDegrees: number;
  if (isEqual) {
    rightDegrees = leftDegrees;
  } else {
    const minGap = MIN_GAP_BY_DIFFICULTY[difficulty];
    let candidate: number;
    let attempts = 0;
    do {
      const sign = random() < 0.5 ? -1 : 1;
      const gap = minGap + randomInt(random, 0, 25);
      candidate = leftDegrees + sign * gap;
      attempts += 1;
    } while ((candidate < 10 || candidate > 170 || Math.abs(candidate - leftDegrees) < minGap) && attempts < 50);
    rightDegrees = Math.min(170, Math.max(10, candidate));
    // Guard against the clamp accidentally producing a too-small (or zero) gap.
    if (Math.abs(rightDegrees - leftDegrees) < minGap) {
      rightDegrees = leftDegrees >= 90 ? leftDegrees - minGap : leftDegrees + minGap;
    }
  }

  const left = buildSide(random, leftVertex, leftArms, leftDegrees, difficulty);
  const right = buildSide(random, rightVertex, rightArms, rightDegrees, difficulty);
  const answer = left.degrees < right.degrees ? '<' : left.degrees > right.degrees ? '>' : '=';

  return {
    id: `angles-compare-${difficulty}-${index}`,
    kind: 'compare',
    difficulty,
    left,
    right,
    answer,
    options: ['<', '=', '>'],
    feedbackKey: `anglesGrade7.compare.feedback.${answer === '<' ? 'less' : answer === '>' ? 'greater' : 'equal'}`,
  };
}

export function assertAngleCompareChallengeIsSound(challenge: AngleCompareChallenge): void {
  if (new Set(challenge.options).size !== challenge.options.length) throw new Error('duplicate comparison options');
  if (challenge.options.filter((option) => option === challenge.answer).length !== 1) {
    throw new Error('compare question must have exactly one correct comparison');
  }
  const expected = challenge.left.degrees < challenge.right.degrees ? '<' : challenge.left.degrees > challenge.right.degrees ? '>' : '=';
  if (expected !== challenge.answer) throw new Error('compare answer disagrees with the actual measured angles');
}

export interface AnglesCompareTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildAnglesCompareQuestions({ difficultyId, count, seed }: AnglesCompareTrainingInput): TrainingQuestion<AngleCompareChallenge>[] {
  const difficulty: AnglesDifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, index, random);
    assertAngleCompareChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: 'anglesGrade7.compare.prompt.compare',
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const ANGLES_COMPARE_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 10, 15],
  defaultQuestionCount: 10,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'anglesGrade7.compare.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'anglesGrade7.compare.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'anglesGrade7.compare.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: ANGLES_COMPARE_RULES_VERSION,
};

export const anglesCompareActivity: TrainingActivityDefinition<AngleCompareChallenge> = {
  id: 'anglesCompare',
  i18nPrefix: 'anglesGrade7.compare',
  capabilities: ANGLES_COMPARE_CAPABILITIES,
  generateQuestions: buildAnglesCompareQuestions,
};
