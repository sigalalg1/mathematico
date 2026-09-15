import type { AddSubChallenge, AddSubMistake, AddSubOperator } from '../../types/signedAddSub';

const MAX_ATTEMPTS = 2000;

export const ADD_SUB_STEP = 1;
const MIN_MOVE = 2;

type Sign = 'negative' | 'positive';

interface LevelSpec {
  id: string;
  min: number;
  max: number;
  operator: AddSubOperator;
  startSign: Sign;
  termSign: Sign;
  /** When set, the landing point must end up on this side of zero. */
  resultSign?: Sign;
}

/**
 * Eight questions walking through every combination that matters, in the order
 * they are normally taught: adding first, then subtracting, and the two
 * "turn around" cases (adding a negative, subtracting a negative) last.
 */
const LEVELS: LevelSpec[] = [
  { id: 'q1', min: -10, max: 10, operator: '+', startSign: 'negative', termSign: 'positive', resultSign: 'positive' },
  { id: 'q2', min: -10, max: 10, operator: '+', startSign: 'positive', termSign: 'negative', resultSign: 'negative' },
  { id: 'q3', min: -10, max: 10, operator: '+', startSign: 'negative', termSign: 'negative' },
  { id: 'q4', min: -10, max: 10, operator: '-', startSign: 'positive', termSign: 'positive', resultSign: 'negative' },
  { id: 'q5', min: -10, max: 10, operator: '-', startSign: 'negative', termSign: 'positive' },
  { id: 'q6', min: -10, max: 10, operator: '-', startSign: 'positive', termSign: 'negative' },
  { id: 'q7', min: -10, max: 10, operator: '-', startSign: 'negative', termSign: 'negative' },
  { id: 'q8', min: -15, max: 15, operator: '-', startSign: 'negative', termSign: 'negative' },
];

export const SIGNED_ADD_SUB_TOTAL = LEVELS.length;

// --- helpers ----------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function tickValues(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += step) values.push(value);
  return values;
}

/** Signed movement the expression describes: subtracting flips the term's direction. */
export function movementOf(operator: AddSubOperator, term: number): number {
  return operator === '+' ? term : -term;
}

export function moveDirection(delta: number): 'left' | 'right' {
  return delta < 0 ? 'left' : 'right';
}

/** Names the misconception behind a wrong landing so the feedback can address it. */
export function classifyAddSub(challenge: AddSubChallenge, clicked: number): AddSubMistake {
  const moved = clicked - challenge.start;
  if (moved === 0) return 'other';
  if (Math.sign(moved) !== Math.sign(challenge.delta)) return 'wrongDirection';
  return 'countSlip';
}

// --- generation -------------------------------------------------------------

function pickSigned(sign: Sign, limit: number): number {
  const magnitude = randomInt(1, limit);
  return sign === 'negative' ? -magnitude : magnitude;
}

function tryBuildChallenge(level: LevelSpec): AddSubChallenge | null {
  const limit = level.max;
  const start = pickSigned(level.startSign, limit);
  const term = pickSigned(level.termSign, limit);
  const delta = movementOf(level.operator, term);
  const result = start + delta;

  if (Math.abs(delta) < MIN_MOVE) return null;
  if (result < level.min || result > level.max) return null;
  if (level.resultSign === 'negative' && result >= 0) return null;
  if (level.resultSign === 'positive' && result <= 0) return null;

  // The opposite-direction landing has to exist on the drawn line, otherwise
  // the commonest mistake could not even be made — or explained.
  const mirrored = start - delta;
  if (mirrored < level.min || mirrored > level.max) return null;

  const challenge: AddSubChallenge = {
    id: level.id,
    min: level.min,
    max: level.max,
    step: ADD_SUB_STEP,
    start,
    operator: level.operator,
    term,
    delta,
    result,
  };

  assertAddSubChallengeIsSound(challenge);
  return challenge;
}

// --- invariants -------------------------------------------------------------

function fail(challenge: AddSubChallenge, reason: string): never {
  throw new Error(`Invalid steps-on-the-line question (${challenge.id}): ${reason}`);
}

export function assertAddSubChallengeIsSound(challenge: AddSubChallenge): void {
  const { min, max, step, start, operator, term, delta, result } = challenge;

  if (!(step > 0) || !Number.isInteger(step)) fail(challenge, 'the tick step must be a positive whole number');
  if (!(min < 0 && max > 0)) fail(challenge, 'the line must show both sides of zero');

  const ticks = tickValues(min, max, step);
  if (!ticks.includes(start)) fail(challenge, 'the starting point is off the line');
  if (!ticks.includes(result)) fail(challenge, 'the landing point is off the line');
  if (start === 0) fail(challenge, 'starting on zero hides which way the sign points');
  if (term === 0) fail(challenge, 'moving by zero teaches nothing');

  if (delta !== movementOf(operator, term)) fail(challenge, 'the movement does not match the written operation');
  if (result !== start + delta) fail(challenge, 'the landing point does not match the movement');
  if (result === start) fail(challenge, 'the walker has to actually move');
  if (Math.abs(delta) < MIN_MOVE) fail(challenge, 'the move is too small to be worth counting');

  // A subtraction of a negative must genuinely turn the walker around, which is
  // the whole point of that case.
  if (operator === '-' && term < 0 && delta <= 0) fail(challenge, 'subtracting a negative must move right');
  if (operator === '+' && term < 0 && delta >= 0) fail(challenge, 'adding a negative must move left');

  const mirrored = start - delta;
  if (mirrored < min || mirrored > max) fail(challenge, 'the wrong-direction landing is not on the drawn line');
  if (!Number.isInteger(start) || !Number.isInteger(term)) fail(challenge, 'every number here must be whole');
}

// --- public API -------------------------------------------------------------

export function addSubQuestionSignature(challenge: AddSubChallenge): string {
  return [challenge.start, challenge.operator, challenge.term].join('|');
}

function buildChallenge(level: LevelSpec, taken: Set<string>): AddSubChallenge {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const challenge = tryBuildChallenge(level);
    if (!challenge) continue;
    const signature = addSubQuestionSignature(challenge);
    if (taken.has(signature)) continue;
    taken.add(signature);
    return challenge;
  }
  throw new Error(`Could not build a sound steps-on-the-line question for level ${level.id}`);
}

/** One full session: eight questions, ordered from simplest to hardest. */
export function buildSignedAddSubChallenges(): AddSubChallenge[] {
  const taken = new Set<string>();
  return LEVELS.map((level) => buildChallenge(level, taken));
}
