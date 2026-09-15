import type { PlaceChallenge, PlacementCount, PlacementMistake } from '../../types/numberLinePlace';

const MAX_ATTEMPTS = 2000;

interface LevelSpec {
  id: string;
  min: number;
  max: number;
  step: number;
  /** Label every k-th tick. 1 labels them all (before the target's own label is removed). */
  labelEvery: number;
  /** Also unlabel this many ticks on each side of the target, so counting is required. */
  hideAround: number;
  sign: 'positive' | 'negative' | 'any';
}

/**
 * Eight questions, easiest first: a fully numbered short line, then longer
 * lines with fewer and fewer labels and larger steps. The student never sees a
 * level number — only a line that keeps asking for a little more.
 */
const LEVELS: LevelSpec[] = [
  { id: 'q1', min: -5, max: 5, step: 1, labelEvery: 1, hideAround: 1, sign: 'positive' },
  { id: 'q2', min: -5, max: 5, step: 1, labelEvery: 1, hideAround: 1, sign: 'negative' },
  { id: 'q3', min: -10, max: 10, step: 1, labelEvery: 5, hideAround: 0, sign: 'negative' },
  { id: 'q4', min: -10, max: 10, step: 1, labelEvery: 10, hideAround: 0, sign: 'any' },
  { id: 'q5', min: -20, max: 20, step: 2, labelEvery: 5, hideAround: 0, sign: 'any' },
  { id: 'q6', min: -20, max: 20, step: 2, labelEvery: 10, hideAround: 0, sign: 'negative' },
  { id: 'q7', min: -50, max: 50, step: 5, labelEvery: 5, hideAround: 0, sign: 'negative' },
  { id: 'q8', min: -100, max: 100, step: 10, labelEvery: 10, hideAround: 0, sign: 'any' },
];

export const NUMBER_LINE_PLACE_TOTAL = LEVELS.length;

// --- helpers ----------------------------------------------------------------

function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function tickValues(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += step) values.push(value);
  return values;
}

/** Ticks between two values, signed: positive means the target is to the right. */
export function countTicks(from: number, to: number, step: number): number {
  return (to - from) / step;
}

export function placementCount(challenge: PlaceChallenge): PlacementCount {
  const signed = countTicks(challenge.anchor, challenge.target, challenge.step);
  return { ticks: Math.abs(signed), direction: signed < 0 ? 'left' : 'right' };
}

/** Classifies a wrong tick so the feedback can teach instead of just marking it wrong. */
export function classifyPlacement(challenge: PlaceChallenge, clicked: number): PlacementMistake {
  if (clicked === -challenge.target) return 'signFlip';
  const off = Math.abs(countTicks(challenge.target, clicked, challenge.step));
  if (off <= 2) return 'offByTicks';
  return 'other';
}

// --- generation -------------------------------------------------------------

function tryBuildChallenge(level: LevelSpec): PlaceChallenge | null {
  const ticks = tickValues(level.min, level.max, level.step);
  const labelStride = level.step * level.labelEvery;

  const targetPool = ticks.filter((value) => {
    if (value === 0) return false;
    // The extremes are always labelled anchors, so they would give the answer away.
    if (value === level.min || value === level.max) return false;
    if (level.sign === 'positive') return value > 0;
    if (level.sign === 'negative') return value < 0;
    return true;
  });
  if (targetPool.length === 0) return null;

  const target = randomOf(targetPool);

  const labeled = ticks.filter((value) => {
    if (value === 0) return true; // the origin always stays readable
    if (value % labelStride !== 0) return false;
    if (value === target) return false;
    return Math.abs(countTicks(target, value, level.step)) > level.hideAround;
  });
  if (labeled.length < 2) return null;

  const anchor = [...labeled].sort(
    (a, b) => Math.abs(a - target) - Math.abs(b - target) || Math.abs(a) - Math.abs(b),
  )[0];

  const challenge: PlaceChallenge = {
    id: level.id,
    min: level.min,
    max: level.max,
    step: level.step,
    labeledValues: labeled,
    target,
    anchor,
  };

  assertPlaceChallengeIsSound(challenge);
  return challenge;
}

// --- invariants -------------------------------------------------------------

function fail(challenge: PlaceChallenge, reason: string): never {
  throw new Error(`Invalid find-the-spot question (${challenge.id}): ${reason}`);
}

/**
 * Refuses a question the student could not solve from what is drawn, or that
 * could be read with more than one tick spacing.
 */
export function assertPlaceChallengeIsSound(challenge: PlaceChallenge): void {
  const { min, max, step, labeledValues, target, anchor } = challenge;

  if (!(step > 0) || !Number.isInteger(step)) fail(challenge, 'the tick step must be a positive whole number');
  if (!(min < 0 && max > 0)) fail(challenge, 'the line must show both sides of zero');
  if (min % step !== 0 || max % step !== 0) fail(challenge, 'the ends of the line must land on ticks');

  const ticks = tickValues(min, max, step);
  if (ticks.length < 5) fail(challenge, 'the line needs enough ticks to count along');
  if (!ticks.includes(0)) fail(challenge, 'zero must be a tick');

  if (!ticks.includes(target)) fail(challenge, 'the target is not on a tick');
  if (target === 0) fail(challenge, 'zero is never the target');
  if (labeledValues.includes(target)) fail(challenge, 'the target tick must not show its own number');

  if (new Set(labeledValues).size !== labeledValues.length) fail(challenge, 'duplicate label');
  for (const value of labeledValues) {
    if (!ticks.includes(value)) fail(challenge, `labelled value ${value} is not a tick`);
  }
  if (!labeledValues.includes(0)) fail(challenge, 'the origin must stay labelled');
  // Two known (position, value) pairs fix the step and the offset, so the line
  // can only be read one way. Fewer than two leaves the spacing unknown.
  if (labeledValues.length < 2) fail(challenge, 'the line does not show enough to work the step out');
  if (labeledValues.length === ticks.length) fail(challenge, 'a fully labelled line asks nothing');

  // Read the way a student reads it: from drawn tick *positions* and the
  // numbers printed on them. Every labelled pair must imply the same spacing.
  const positionOf = (value: number) => ticks.indexOf(value);
  for (const a of labeledValues) {
    for (const b of labeledValues) {
      if (a === b) continue;
      const derived = (b - a) / (positionOf(b) - positionOf(a));
      if (derived !== step) fail(challenge, 'the labels allow more than one tick spacing');
    }
  }

  if (!labeledValues.includes(anchor)) fail(challenge, 'the explanation counts from a tick with no number on it');
  const gap = Math.abs(countTicks(anchor, target, step));
  if (gap < 1) fail(challenge, 'the anchor must not sit on the target');
  for (const value of labeledValues) {
    if (Math.abs(countTicks(value, target, step)) < gap) fail(challenge, 'a nearer labelled tick than the anchor exists');
  }
}

// --- public API -------------------------------------------------------------

export function placeQuestionSignature(challenge: PlaceChallenge): string {
  return [challenge.min, challenge.max, challenge.step, challenge.target, challenge.labeledValues.join('.')].join('|');
}

function buildChallenge(level: LevelSpec, taken: Set<string>): PlaceChallenge {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const challenge = tryBuildChallenge(level);
    if (!challenge) continue;
    const signature = placeQuestionSignature(challenge);
    if (taken.has(signature)) continue;
    taken.add(signature);
    return challenge;
  }
  throw new Error(`Could not build a sound find-the-spot question for level ${level.id}`);
}

/** One full session: eight questions, ordered from simplest to hardest. */
export function buildNumberLinePlaceChallenges(): PlaceChallenge[] {
  const taken = new Set<string>();
  return LEVELS.map((level) => buildChallenge(level, taken));
}
