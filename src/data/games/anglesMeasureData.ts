import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { AngleMeasureChallenge, AnglesDifficultyId } from '../../types/anglesGrade7';
import { normalizeAngleMeasure, pointFromAngle } from '../../geometry/angleMath';
import { createSeededRandom, randomInt } from '../../utils/seededRandom';
import { randomBaseRotation, STAGE_CENTER } from './anglesGrade7Shared';

/**
 * The exam's third skill (alongside identifying angle types and angle
 * notation — see the audit): actually *measuring* an angle. There is no
 * textbook-excerpt source for a digital-protractor mechanic specifically
 * (the excerpt only shows static printed-page protractor diagrams); the
 * interactive reading lab itself is this build's own addition, in the same
 * spirit as the construct-an-angle drag lab — called out explicitly here per
 * the mission brief.
 *
 * Unlike `anglesConstructData` (the student *builds* an angle by dragging),
 * here the angle is already fixed per question — one reference ray, one
 * measured ray — and the student reads its measure off an overlaid
 * `Protractor` whose own baseline the page auto-aligns to the reference ray.
 * The generator's single most important job is get that alignment math
 * right: the reference ray's *relative* direction is always built as exactly
 * 0° before any scene rotation is applied (see `buildRotatedReferenceRay`),
 * so the page can always recover the fixed ray's true drawn direction from
 * the very same scene data the renderer itself draws from — never a
 * separately-tracked angle that could silently drift out of sync.
 */
export const ANGLES_MEASURE_RULES_VERSION = 1;

/**
 * How "nice" the generated target angle is, per difficulty — basic always
 * lands on a multiple of 5° (a real protractor's major ticks), so an early
 * learner is always reading a labelled line exactly; higher tiers allow any
 * integer degree, landing between ticks like a real reading often does.
 */
const NICE_STEP_BY_DIFFICULTY: Record<AnglesDifficultyId, number> = {
  basic: 5,
  intermediate: 1,
  advanced: 1,
};

/**
 * Reading-by-eye tolerance, in degrees, per difficulty — tighter at higher
 * tiers. Each is kept strictly below its own `NICE_STEP_BY_DIFFICULTY` value
 * (with a clear margin) specifically so a basic-tier acceptance window can
 * never reach a neighbouring "nice" multiple-of-5 value — see
 * `assertAngleMeasureChallengeIsSound`.
 */
const TOLERANCE_DEG_BY_DIFFICULTY: Record<AnglesDifficultyId, number> = {
  basic: 3,
  intermediate: 3,
  advanced: 2,
};

/**
 * Safe target range: far enough from the 0°/180° degenerate ends that the
 * acceptance window never crosses either boundary, for every tolerance above
 * — matching how the rest of this unit avoids degenerate angles outright
 * rather than merely tolerating them near a boundary.
 */
const TARGET_RANGE = { min: 15, max: 165 };

function pickTargetDegrees(difficulty: AnglesDifficultyId, random: () => number): number {
  const step = NICE_STEP_BY_DIFFICULTY[difficulty];
  const minSteps = Math.ceil(TARGET_RANGE.min / step);
  const maxSteps = Math.floor(TARGET_RANGE.max / step);
  return randomInt(random, minSteps, maxSteps) * step;
}

function makeChallenge(difficulty: AnglesDifficultyId, index: number, random: () => number): AngleMeasureChallenge {
  const vertex = STAGE_CENTER;
  // The reference ray's *relative* direction is always exactly 0° — "simple,
  // horizontal-pointing-right in the scene's own local coordinate frame" —
  // before `baseRotationDeg` turns the whole scene together. Rotating both
  // rays by the same amount can never change the angle between them (the
  // same invariant every other Grade 7 Angles generator in this unit relies
  // on), so this is exactly as simple at every tier as the brief asks for,
  // while still reusing the unit's one shared rotation knob.
  const baseRotationDeg = randomBaseRotation(random, difficulty);
  const targetDegrees = pickTargetDegrees(difficulty, random);

  const fixedThrough = pointFromAngle(vertex, baseRotationDeg, 100);
  // The measured ray is always `targetDegrees` further around in the exact
  // same rotational direction `Protractor`'s default `sweep` numbers in —
  // see `Protractor`'s own doc comment — so its reading always lands exactly
  // on the tick for `targetDegrees`.
  const measuredThrough = pointFromAngle(vertex, baseRotationDeg + targetDegrees, 100);

  const toleranceDeg = TOLERANCE_DEG_BY_DIFFICULTY[difficulty];

  return {
    id: `angles-measure-${difficulty}-${index}`,
    kind: 'measure',
    difficulty,
    vertex,
    fixedThrough,
    measuredThrough,
    targetDegrees,
    toleranceDeg,
    answer: String(targetDegrees),
    options: [String(targetDegrees)],
    promptKey: 'anglesGrade7.measure.prompt',
    feedbackKey: 'anglesGrade7.measure.feedback.wrong',
  };
}

export function assertAngleMeasureChallengeIsSound(challenge: AngleMeasureChallenge): void {
  if (challenge.options.length !== 1 || challenge.options[0] !== challenge.answer) {
    throw new Error('measure question must encode exactly one correct answer');
  }
  if (String(challenge.targetDegrees) !== challenge.answer) {
    throw new Error('measure answer must equal the target degrees as a string');
  }
  if (challenge.targetDegrees <= 0 || challenge.targetDegrees >= 180) {
    throw new Error('measure target must be a genuine angle, strictly between 0° and 180°');
  }
  if (challenge.targetDegrees - challenge.toleranceDeg <= 0 || challenge.targetDegrees + challenge.toleranceDeg >= 180) {
    throw new Error('measure tolerance window must not reach the degenerate 0°/180° boundaries');
  }

  const step = NICE_STEP_BY_DIFFICULTY[challenge.difficulty];
  if (step > 1) {
    if (challenge.targetDegrees % step !== 0) throw new Error(`measure target must be a multiple of ${step}° at this difficulty`);
    // The acceptance window must never reach a neighbouring "nice" value —
    // otherwise two adjacent ticks would both read as correct.
    if (challenge.toleranceDeg >= step) {
      throw new Error('measure tolerance must be strictly smaller than the "nice" step, or neighbouring nice values become ambiguous');
    }
  }

  // The single most important correctness property of this whole feature:
  // the angle actually spanned between the two rays, as literally drawn,
  // must equal `targetDegrees` — computed independently here via plain
  // trigonometry, never by trusting the generator's own arithmetic.
  const fixedDeg = (Math.atan2(challenge.fixedThrough.y - challenge.vertex.y, challenge.fixedThrough.x - challenge.vertex.x) * 180) / Math.PI;
  const measuredDeg = (Math.atan2(challenge.measuredThrough.y - challenge.vertex.y, challenge.measuredThrough.x - challenge.vertex.x) * 180) / Math.PI;
  const degDiff = normalizeAngleMeasure(measuredDeg - fixedDeg) > 180 ? 360 - normalizeAngleMeasure(measuredDeg - fixedDeg) : normalizeAngleMeasure(measuredDeg - fixedDeg);
  if (Math.abs(degDiff - challenge.targetDegrees) > 1e-6) {
    throw new Error('measure: the actual drawn angle between the two rays does not match targetDegrees');
  }

  // Equally important: the protractor's baseline must align to the *actual*
  // fixed-ray direction, and the measured ray must sit on the exact tick for
  // `targetDegrees` going the same way `Protractor`'s default sweep numbers
  // in (i.e. `fixedDeg + targetDegrees`, not `fixedDeg - targetDegrees`).
  // Compared as a circular distance (not a plain subtraction) so a target
  // that wraps exactly through the 0°/360° seam is still recognised as a
  // match rather than a false ~360° mismatch.
  const expectedMeasuredDeg = (((fixedDeg + challenge.targetDegrees) % 360) + 360) % 360;
  const actualMeasuredDeg = ((measuredDeg % 360) + 360) % 360;
  const rawGap = Math.abs(expectedMeasuredDeg - actualMeasuredDeg);
  const circularGap = Math.min(rawGap, 360 - rawGap);
  if (circularGap > 1e-6) {
    throw new Error('measure: the measured ray is not positioned at fixedDeg + targetDegrees — the protractor reading would not match');
  }
}

export interface AnglesMeasureTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildAnglesMeasureQuestions({ difficultyId, count, seed }: AnglesMeasureTrainingInput): TrainingQuestion<AngleMeasureChallenge>[] {
  const difficulty: AnglesDifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, index, random);
    assertAngleMeasureChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const ANGLES_MEASURE_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 10, 15],
  defaultQuestionCount: 10,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'anglesGrade7.measure.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'anglesGrade7.measure.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'anglesGrade7.measure.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: ANGLES_MEASURE_RULES_VERSION,
};

export const anglesMeasureActivity: TrainingActivityDefinition<AngleMeasureChallenge> = {
  id: 'anglesMeasure',
  i18nPrefix: 'anglesGrade7.measure',
  capabilities: ANGLES_MEASURE_CAPABILITIES,
  generateQuestions: buildAnglesMeasureQuestions,
};
