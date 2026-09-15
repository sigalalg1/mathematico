import type { CompareChallenge, CompareGoal, CompareMistake } from '../../types/compareSigned';
import { shuffle } from '../../utils/shuffle';

const MAX_ATTEMPTS = 2000;
const CANDIDATE_IDS = ['a', 'b', 'c'] as const;

type SignMix = 'mixed' | 'allNegative' | 'twoNegative';

interface LevelSpec {
  id: string;
  min: number;
  max: number;
  step: number;
  count: 2 | 3;
  goal: CompareGoal;
  signs: SignMix;
  /** Largest allowed gap between the two extreme candidates, in value units. */
  maxSpread?: number;
}

/**
 * Eight questions. Every one of them is built so that comparing the digits and
 * ignoring the minus sign gives a *wrong* answer — the misconception is the
 * whole point of the activity, so it is never left to chance.
 */
const LEVELS: LevelSpec[] = [
  { id: 'q1', min: -10, max: 10, step: 1, count: 2, goal: 'greatest', signs: 'mixed' },
  { id: 'q2', min: -10, max: 10, step: 1, count: 2, goal: 'greatest', signs: 'allNegative' },
  { id: 'q3', min: -10, max: 10, step: 1, count: 2, goal: 'smallest', signs: 'allNegative' },
  { id: 'q4', min: -10, max: 10, step: 1, count: 2, goal: 'greatest', signs: 'allNegative', maxSpread: 3 },
  { id: 'q5', min: -10, max: 10, step: 1, count: 2, goal: 'smallest', signs: 'mixed' },
  { id: 'q6', min: -10, max: 10, step: 1, count: 3, goal: 'greatest', signs: 'twoNegative' },
  { id: 'q7', min: -10, max: 10, step: 1, count: 3, goal: 'smallest', signs: 'twoNegative' },
  { id: 'q8', min: -20, max: 20, step: 2, count: 3, goal: 'greatest', signs: 'twoNegative' },
];

export const COMPARE_SIGNED_TOTAL = LEVELS.length;

// --- helpers ----------------------------------------------------------------

function valuePool(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += step) {
    // Zero sits on neither side, which would blur the "which side of 0" lesson.
    if (value !== 0) values.push(value);
  }
  return values;
}

export function expectedAnswer(values: number[], goal: CompareGoal): number {
  return goal === 'greatest' ? Math.max(...values) : Math.min(...values);
}

/**
 * True when reading the digits and ignoring the sign leads somewhere else.
 * `-7` looks bigger than `-3` but is smaller, and that trap must be present.
 */
export function hasAbsoluteTrap(values: number[], goal: CompareGoal): boolean {
  const answer = expectedAnswer(values, goal);
  return values.some((value) =>
    value === answer ? false : goal === 'greatest' ? Math.abs(value) > Math.abs(answer) : Math.abs(value) < Math.abs(answer),
  );
}

/** Names the misconception behind a wrong pick so the feedback can address it. */
export function classifyCompare(challenge: CompareChallenge, clicked: number): CompareMistake {
  const { goal, answer } = challenge;
  if (goal === 'greatest' && clicked < 0 && answer > 0) return 'signConfusion';
  if (goal === 'smallest' && clicked > 0 && answer < 0) return 'signConfusion';
  const readDigitsOnly =
    goal === 'greatest' ? Math.abs(clicked) > Math.abs(answer) : Math.abs(clicked) < Math.abs(answer);
  return readDigitsOnly ? 'absoluteConfusion' : 'other';
}

// --- generation -------------------------------------------------------------

function satisfiesSigns(values: number[], signs: SignMix): boolean {
  const negatives = values.filter((value) => value < 0).length;
  if (signs === 'allNegative') return negatives === values.length;
  if (signs === 'twoNegative') return negatives >= 2 && negatives < values.length;
  return negatives >= 1 && negatives < values.length;
}

function tryBuildChallenge(level: LevelSpec): CompareChallenge | null {
  const pool = valuePool(level.min, level.max, level.step);
  const values = shuffle(pool).slice(0, level.count);
  if (new Set(values).size !== level.count) return null;
  if (!satisfiesSigns(values, level.signs)) return null;

  const spread = Math.max(...values) - Math.min(...values);
  if (level.maxSpread !== undefined && spread > level.maxSpread) return null;
  if (spread < level.step) return null;
  if (!hasAbsoluteTrap(values, level.goal)) return null;

  const answer = expectedAnswer(values, level.goal);
  const candidates = values
    .slice()
    .sort((a, b) => a - b)
    .map((value, index) => ({ id: `${level.id}-${CANDIDATE_IDS[index]}`, value }));
  const correct = candidates.find((candidate) => candidate.value === answer);
  if (!correct) return null;

  const challenge: CompareChallenge = {
    id: level.id,
    min: level.min,
    max: level.max,
    step: level.step,
    goal: level.goal,
    candidates,
    answer,
    correctCandidateId: correct.id,
  };

  assertCompareChallengeIsSound(challenge);
  return challenge;
}

// --- invariants -------------------------------------------------------------

function fail(challenge: CompareChallenge, reason: string): never {
  throw new Error(`Invalid which-is-greater question (${challenge.id}): ${reason}`);
}

export function assertCompareChallengeIsSound(challenge: CompareChallenge): void {
  const { min, max, step, candidates, answer, goal } = challenge;

  if (!(step > 0) || !Number.isInteger(step)) fail(challenge, 'the tick step must be a positive whole number');
  if (!(min < 0 && max > 0)) fail(challenge, 'the line must show both sides of zero');

  if (candidates.length < 2 || candidates.length > 3) fail(challenge, 'a question compares 2 or 3 numbers');
  if (new Set(candidates.map((c) => c.value)).size !== candidates.length) fail(challenge, 'two candidates share a value');
  if (new Set(candidates.map((c) => c.id)).size !== candidates.length) fail(challenge, 'duplicate candidate id');

  for (const candidate of candidates) {
    if (!Number.isInteger(candidate.value)) fail(challenge, 'candidates must be whole numbers');
    if (candidate.value === 0) fail(challenge, 'zero is never a candidate');
    if (candidate.value < min || candidate.value > max) fail(challenge, 'a candidate is off the drawn line');
    if (candidate.value % step !== 0) fail(challenge, 'a candidate does not land on a tick');
  }

  const values = candidates.map((c) => c.value);
  const expected = expectedAnswer(values, goal);
  if (expected !== answer) fail(challenge, 'the stored answer is not the extreme value');
  if (values.filter((value) => value === answer).length !== 1) fail(challenge, 'the answer must be unique');

  const correct = candidates.find((c) => c.id === challenge.correctCandidateId);
  if (!correct) fail(challenge, 'correctCandidateId points at nothing');
  if (correct.value !== answer) fail(challenge, 'correctCandidateId points at the wrong candidate');

  // Without this the question could be solved by reading the digits alone, and
  // would teach nothing about what a minus sign means.
  if (!hasAbsoluteTrap(values, goal)) fail(challenge, 'comparing the digits alone would already give the answer');

  if (!candidates.some((c) => c.value < 0)) fail(challenge, 'at least one candidate must be negative');
}

// --- public API -------------------------------------------------------------

export function compareQuestionSignature(challenge: CompareChallenge): string {
  return [challenge.goal, challenge.step, ...challenge.candidates.map((c) => c.value)].join('|');
}

function buildChallenge(level: LevelSpec, taken: Set<string>): CompareChallenge {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const challenge = tryBuildChallenge(level);
    if (!challenge) continue;
    const signature = compareQuestionSignature(challenge);
    if (taken.has(signature)) continue;
    taken.add(signature);
    return challenge;
  }
  throw new Error(`Could not build a sound which-is-greater question for level ${level.id}`);
}

/** One full session: eight questions, ordered from simplest to hardest. */
export function buildCompareSignedChallenges(): CompareChallenge[] {
  const taken = new Set<string>();
  return LEVELS.map((level) => buildChallenge(level, taken));
}
