import type { AbsoluteChallenge, AbsoluteKind, AbsoluteMistake } from '../../types/absoluteValue';
import { formatSigned } from '../../utils/signedNumbers';

const MAX_ATTEMPTS = 2000;

export const ABSOLUTE_VALUE_MIN = -10;
export const ABSOLUTE_VALUE_MAX = 10;
export const ABSOLUTE_VALUE_STEP = 1;

type SubjectSign = 'negative' | 'positive';
type PairShape = 'sameSidePositive' | 'sameSideNegative' | 'acrossZero';

interface LevelSpec {
  id: string;
  kind: AbsoluteKind;
  /** `evaluate`: which side the number inside the bars sits on. */
  subjectSign?: SubjectSign;
  /** `evaluate`: allowed distances from zero. */
  range?: [number, number];
  /** `findFromDistance`: which side the answer must be on. */
  side?: SubjectSign;
  /** `distanceBetween`: where the two points sit relative to zero. */
  pair?: PairShape;
}

/**
 * Eight questions: read an absolute value, then work backwards from a
 * distance, then measure between two points — the same idea, asked three ways.
 */
const LEVELS: LevelSpec[] = [
  { id: 'q1', kind: 'evaluate', subjectSign: 'negative', range: [1, 5] },
  { id: 'q2', kind: 'evaluate', subjectSign: 'positive', range: [1, 10] },
  { id: 'q3', kind: 'evaluate', subjectSign: 'negative', range: [6, 10] },
  { id: 'q4', kind: 'findFromDistance', side: 'negative' },
  { id: 'q5', kind: 'findFromDistance', side: 'positive' },
  { id: 'q6', kind: 'distanceBetween', pair: 'sameSidePositive' },
  { id: 'q7', kind: 'distanceBetween', pair: 'acrossZero' },
  { id: 'q8', kind: 'distanceBetween', pair: 'sameSideNegative' },
];

export const ABSOLUTE_VALUE_TOTAL = LEVELS.length;

// --- helpers ----------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function tickValues(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += step) values.push(value);
  return values;
}

/** The answer a correct student would give — derived, never stored blindly. */
export function expectedAbsoluteAnswer(challenge: AbsoluteChallenge): number {
  switch (challenge.kind) {
    case 'evaluate':
      return Math.abs(challenge.subject);
    case 'findFromDistance':
      return challenge.side === 'negative' ? -challenge.distance : challenge.distance;
    case 'distanceBetween':
      return Math.abs((challenge.partner ?? 0) - challenge.subject);
  }
}

/** Names the misconception behind a wrong click so the feedback can address it. */
export function classifyAbsolute(challenge: AbsoluteChallenge, clicked: number): AbsoluteMistake {
  const { answer, kind } = challenge;
  if (clicked === -answer && clicked !== answer) {
    return kind === 'findFromDistance' ? 'wrongSide' : 'negatedAnswer';
  }
  if (Math.abs(clicked - answer) <= 2 * challenge.step) return 'offByGap';
  return 'other';
}

// --- generation -------------------------------------------------------------

function buildEvaluate(level: LevelSpec): AbsoluteChallenge | null {
  const [low, high] = level.range ?? [1, ABSOLUTE_VALUE_MAX];
  const magnitude = randomInt(low, high);
  const subject = level.subjectSign === 'negative' ? -magnitude : magnitude;
  return {
    id: level.id,
    kind: 'evaluate',
    min: ABSOLUTE_VALUE_MIN,
    max: ABSOLUTE_VALUE_MAX,
    step: ABSOLUTE_VALUE_STEP,
    subject,
    partner: null,
    distance: magnitude,
    side: null,
    answer: magnitude,
    plotted: [{ id: `${level.id}-subject`, value: subject, label: formatSigned(subject) }],
  };
}

function buildFindFromDistance(level: LevelSpec): AbsoluteChallenge | null {
  const distance = randomInt(1, ABSOLUTE_VALUE_MAX);
  const side = level.side ?? 'negative';
  const answer = side === 'negative' ? -distance : distance;
  return {
    id: level.id,
    kind: 'findFromDistance',
    min: ABSOLUTE_VALUE_MIN,
    max: ABSOLUTE_VALUE_MAX,
    step: ABSOLUTE_VALUE_STEP,
    subject: answer,
    partner: null,
    distance,
    side,
    answer,
    plotted: [],
  };
}

function buildDistanceBetween(level: LevelSpec): AbsoluteChallenge | null {
  let left: number;
  let right: number;

  if (level.pair === 'sameSidePositive') {
    left = randomInt(1, 6);
    right = randomInt(left + 1, ABSOLUTE_VALUE_MAX);
  } else if (level.pair === 'sameSideNegative') {
    right = randomInt(-6, -1);
    left = randomInt(ABSOLUTE_VALUE_MIN, right - 1);
  } else {
    left = randomInt(ABSOLUTE_VALUE_MIN, -1);
    right = randomInt(1, ABSOLUTE_VALUE_MAX);
  }

  const answer = right - left;
  // The answer is clicked on the same line, so it has to fit on it — and a
  // one-tick gap makes the question trivial.
  if (answer < 2 || answer > ABSOLUTE_VALUE_MAX) return null;

  return {
    id: level.id,
    kind: 'distanceBetween',
    min: ABSOLUTE_VALUE_MIN,
    max: ABSOLUTE_VALUE_MAX,
    step: ABSOLUTE_VALUE_STEP,
    subject: left,
    partner: right,
    distance: answer,
    side: null,
    answer,
    plotted: [
      { id: `${level.id}-a`, value: left, label: 'A' },
      { id: `${level.id}-b`, value: right, label: 'B' },
    ],
  };
}

function tryBuildChallenge(level: LevelSpec): AbsoluteChallenge | null {
  const challenge =
    level.kind === 'evaluate'
      ? buildEvaluate(level)
      : level.kind === 'findFromDistance'
        ? buildFindFromDistance(level)
        : buildDistanceBetween(level);
  if (!challenge) return null;
  assertAbsoluteChallengeIsSound(challenge);
  return challenge;
}

// --- invariants -------------------------------------------------------------

function fail(challenge: AbsoluteChallenge, reason: string): never {
  throw new Error(`Invalid distance-from-zero question (${challenge.id}): ${reason}`);
}

export function assertAbsoluteChallengeIsSound(challenge: AbsoluteChallenge): void {
  const { min, max, step, kind, subject, partner, distance, side, answer, plotted } = challenge;

  if (!(step > 0) || !Number.isInteger(step)) fail(challenge, 'the tick step must be a positive whole number');
  if (!(min < 0 && max > 0)) fail(challenge, 'the line must show both sides of zero');

  const ticks = tickValues(min, max, step);
  if (!ticks.includes(answer)) fail(challenge, 'the answer cannot be clicked on this line');
  if (!Number.isInteger(answer)) fail(challenge, 'the answer must be a whole number');
  if (answer !== expectedAbsoluteAnswer(challenge)) fail(challenge, 'the stored answer does not match the question');

  for (const point of plotted) {
    if (!ticks.includes(point.value)) fail(challenge, 'a drawn point is off the line');
  }
  if (new Set(plotted.map((point) => point.value)).size !== plotted.length) {
    fail(challenge, 'two drawn points share a position');
  }
  if (new Set(plotted.map((point) => point.id)).size !== plotted.length) fail(challenge, 'duplicate drawn point id');

  if (kind === 'evaluate') {
    if (subject === 0) fail(challenge, 'the absolute value of zero teaches nothing here');
    if (!ticks.includes(subject)) fail(challenge, 'the number inside the bars is off the line');
    if (answer <= 0) fail(challenge, 'an absolute value is never negative');
    if (answer !== Math.abs(subject)) fail(challenge, 'the answer is not the distance from zero');
    if (plotted.length !== 1 || plotted[0].value !== subject) fail(challenge, 'the asked number must be drawn on the line');
    if (partner !== null) fail(challenge, 'an evaluate question has no second point');
  }

  if (kind === 'findFromDistance') {
    if (side !== 'negative' && side !== 'positive') fail(challenge, 'the question must name a side of zero');
    if (!(distance > 0)) fail(challenge, 'the asked distance must be positive');
    if (Math.abs(answer) !== distance) fail(challenge, 'the answer is not at the asked distance');
    if (side === 'negative' && answer >= 0) fail(challenge, 'the answer is on the wrong side of zero');
    if (side === 'positive' && answer <= 0) fail(challenge, 'the answer is on the wrong side of zero');
    // Naming a side is what makes the answer unique: without it both +d and -d
    // would be right.
    if (plotted.length !== 0) fail(challenge, 'this question must not give the point away');
  }

  if (kind === 'distanceBetween') {
    if (partner === null) fail(challenge, 'a distance question needs two points');
    if (partner === subject) fail(challenge, 'the two points must be different');
    if (subject >= partner) fail(challenge, 'the two points must be listed left to right');
    if (answer !== partner - subject) fail(challenge, 'the answer is not the gap between the points');
    if (answer <= 0) fail(challenge, 'a distance is never negative or zero');
    if (plotted.length !== 2) fail(challenge, 'both points must be drawn');
    if (side !== null) fail(challenge, 'a distance question does not name a side');
  }
}

// --- public API -------------------------------------------------------------

export function absoluteQuestionSignature(challenge: AbsoluteChallenge): string {
  return [challenge.kind, challenge.subject, challenge.partner ?? '', challenge.side ?? '', challenge.answer].join('|');
}

function buildChallenge(level: LevelSpec, taken: Set<string>): AbsoluteChallenge {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const challenge = tryBuildChallenge(level);
    if (!challenge) continue;
    const signature = absoluteQuestionSignature(challenge);
    if (taken.has(signature)) continue;
    taken.add(signature);
    return challenge;
  }
  throw new Error(`Could not build a sound distance-from-zero question for level ${level.id}`);
}

/** One full session: eight questions, ordered from simplest to hardest. */
export function buildAbsoluteValueChallenges(): AbsoluteChallenge[] {
  const taken = new Set<string>();
  return LEVELS.map((level) => buildChallenge(level, taken));
}
