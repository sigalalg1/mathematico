import type {
  SignLadderRow,
  SignRuleChallenge,
  SignRuleFamily,
  SignRuleMistake,
  SignRuleOperator,
} from '../../types/signRules';

const MAX_ATTEMPTS = 4000;

export const SIGN_RULES_MIN = -12;
export const SIGN_RULES_MAX = 12;
export const SIGN_RULES_STEP = 1;
const LADDER_ROWS = 3;
const LADDER_MAX_RESULT = 40;

interface LevelSpec {
  id: string;
  operator: SignRuleOperator;
  family: SignRuleFamily;
  /** Discovery questions show the pattern up-front instead of only as a hint. */
  showLadder: boolean;
}

/**
 * Three discovery questions that walk a multiplication pattern down through
 * zero into the negatives — which is where the sign rule comes from — and then
 * five questions that apply the rule, ending with division.
 */
const LEVELS: LevelSpec[] = [
  { id: 'q1', operator: '×', family: 'posNeg', showLadder: true },
  { id: 'q2', operator: '×', family: 'negPos', showLadder: true },
  { id: 'q3', operator: '×', family: 'negNeg', showLadder: true },
  { id: 'q4', operator: '×', family: 'posPos', showLadder: false },
  { id: 'q5', operator: '×', family: 'negNeg', showLadder: false },
  { id: 'q6', operator: '×', family: 'posNeg', showLadder: false },
  { id: 'q7', operator: ':', family: 'negPos', showLadder: false },
  { id: 'q8', operator: ':', family: 'negNeg', showLadder: false },
];

export const SIGN_RULES_TOTAL = LEVELS.length;

// --- helpers ----------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function tickValues(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += step) values.push(value);
  return values;
}

export function familyOf(left: number, right: number): SignRuleFamily {
  const leftSign = left < 0 ? 'neg' : 'pos';
  const rightSign = right < 0 ? 'Neg' : 'Pos';
  return `${leftSign}${rightSign}` as SignRuleFamily;
}

/** The result the sign rule predicts: same signs give a plus, different signs give a minus. */
export function applyOperation(left: number, operator: SignRuleOperator, right: number): number {
  return operator === '×' ? left * right : left / right;
}

/** Names the misconception behind a wrong click so the feedback can address it. */
export function classifySignRule(challenge: SignRuleChallenge, clicked: number): SignRuleMistake {
  return clicked === -challenge.result ? 'signError' : 'magnitudeError';
}

function inRange(value: number): boolean {
  return value >= SIGN_RULES_MIN && value <= SIGN_RULES_MAX;
}

// --- generation -------------------------------------------------------------

function signsFor(family: SignRuleFamily): [number, number] {
  switch (family) {
    case 'posPos':
      return [1, 1];
    case 'posNeg':
      return [1, -1];
    case 'negPos':
      return [-1, 1];
    case 'negNeg':
      return [-1, -1];
  }
}

/**
 * The three rows immediately above the question, made by stepping the first
 * number down by one each time. Walking that pattern is what makes the sign
 * rule feel inevitable rather than arbitrary.
 */
function buildLadder(left: number, right: number): SignLadderRow[] | null {
  const rows: SignLadderRow[] = [];
  for (let offset = LADDER_ROWS; offset >= 1; offset--) {
    const rowLeft = left + offset;
    const result = rowLeft * right;
    // Rows are written out, not plotted, so they may leave the drawn line —
    // but they still have to stay small enough to read at a glance.
    if (Math.abs(result) > LADDER_MAX_RESULT) return null;
    rows.push({ left: rowLeft, right, result });
  }
  return rows;
}

function tryBuildMultiplication(level: LevelSpec): SignRuleChallenge | null {
  const [leftSign, rightSign] = signsFor(level.family);
  // Discovery questions want a first number close to zero so the pattern can
  // start on the other side of it; applied questions want real numbers.
  const left = leftSign * (level.showLadder ? randomInt(1, 3) : randomInt(2, 6));
  const right = rightSign * randomInt(2, 6);
  const result = left * right;

  if (!inRange(result) || !inRange(-result)) return null;
  if (result === 0) return null;

  const ladder = buildLadder(left, right);
  if (!ladder) return null;

  const challenge: SignRuleChallenge = {
    id: level.id,
    min: SIGN_RULES_MIN,
    max: SIGN_RULES_MAX,
    step: SIGN_RULES_STEP,
    operator: '×',
    left,
    right,
    result,
    family: level.family,
    showLadder: level.showLadder,
    ladder,
  };

  assertSignRuleChallengeIsSound(challenge);
  return challenge;
}

function tryBuildDivision(level: LevelSpec): SignRuleChallenge | null {
  const [leftSign, rightSign] = signsFor(level.family);
  const divisor = rightSign * randomInt(2, 6);
  // Choose the quotient first so the division always comes out exactly.
  const quotient = randomInt(2, 6) * (leftSign * rightSign);
  const dividend = quotient * divisor;

  if (!inRange(dividend) || !inRange(quotient) || !inRange(-quotient)) return null;
  if (Math.sign(dividend) !== leftSign) return null;

  const challenge: SignRuleChallenge = {
    id: level.id,
    min: SIGN_RULES_MIN,
    max: SIGN_RULES_MAX,
    step: SIGN_RULES_STEP,
    operator: ':',
    left: dividend,
    right: divisor,
    result: quotient,
    family: level.family,
    showLadder: false,
    ladder: [],
  };

  assertSignRuleChallengeIsSound(challenge);
  return challenge;
}

function tryBuildChallenge(level: LevelSpec): SignRuleChallenge | null {
  return level.operator === '×' ? tryBuildMultiplication(level) : tryBuildDivision(level);
}

// --- invariants -------------------------------------------------------------

function fail(challenge: SignRuleChallenge, reason: string): never {
  throw new Error(`Invalid sign-rule question (${challenge.id}): ${reason}`);
}

export function assertSignRuleChallengeIsSound(challenge: SignRuleChallenge): void {
  const { min, max, step, operator, left, right, result, family, ladder, showLadder } = challenge;

  if (!(step > 0) || !Number.isInteger(step)) fail(challenge, 'the tick step must be a positive whole number');
  if (!(min < 0 && max > 0)) fail(challenge, 'the line must show both sides of zero');

  if (left === 0 || right === 0) fail(challenge, 'zero has no sign, so it cannot appear here');
  if (!Number.isInteger(left) || !Number.isInteger(right)) fail(challenge, 'both numbers must be whole');
  if (!Number.isInteger(result)) fail(challenge, 'the result must be a whole number');
  if (result !== applyOperation(left, operator, right)) fail(challenge, 'the stored result does not match the operation');
  if (result === 0) fail(challenge, 'a zero result would have no sign to reason about');

  // The sign rule itself, checked on every single question.
  if (Math.sign(result) !== Math.sign(left) * Math.sign(right)) fail(challenge, 'the result breaks the sign rule');
  if (family !== familyOf(left, right)) fail(challenge, 'the stored family does not match the signs');

  const ticks = tickValues(min, max, step);
  if (!ticks.includes(result)) fail(challenge, 'the result cannot be clicked on this line');
  // The sign-flipped answer is the mistake this activity exists to catch, so it
  // has to be clickable too — otherwise the trap could not be sprung.
  if (!ticks.includes(-result)) fail(challenge, 'the sign-flipped answer is off the drawn line');

  if (operator === ':') {
    if (Math.abs(right) < 2) fail(challenge, 'dividing by 1 or -1 is not worth asking');
    if (left !== result * right) fail(challenge, 'the division does not come out exactly');
    if (ladder.length !== 0) fail(challenge, 'division questions carry no pattern ladder');
    if (showLadder) fail(challenge, 'there is no pattern to show for a division');
    return;
  }

  if (ladder.length !== 3) fail(challenge, 'a multiplication question needs three pattern rows');
  for (let index = 0; index < ladder.length; index++) {
    const row = ladder[index];
    if (row.right !== right) fail(challenge, 'a pattern row changes the wrong number');
    if (row.left !== left + (ladder.length - index)) fail(challenge, 'the pattern does not step down by one');
    if (row.result !== row.left * row.right) fail(challenge, 'a pattern row has the wrong result');
    if (Math.abs(row.result) > LADDER_MAX_RESULT) fail(challenge, 'a pattern row is too big to read');
    if (row.left === left) fail(challenge, 'the pattern gives the question away');
  }
  // Each row must differ from the next by exactly the second number: that
  // constant step is the pattern the student is asked to continue.
  for (let index = 1; index < ladder.length; index++) {
    if (ladder[index - 1].result - ladder[index].result !== right) fail(challenge, 'the pattern is not a constant step');
  }
  if (ladder[ladder.length - 1].result - result !== right) fail(challenge, 'the question does not continue the pattern');
}

// --- public API -------------------------------------------------------------

export function signRuleQuestionSignature(challenge: SignRuleChallenge): string {
  return [challenge.operator, challenge.left, challenge.right].join('|');
}

function buildChallenge(level: LevelSpec, taken: Set<string>): SignRuleChallenge {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const challenge = tryBuildChallenge(level);
    if (!challenge) continue;
    const signature = signRuleQuestionSignature(challenge);
    if (taken.has(signature)) continue;
    taken.add(signature);
    return challenge;
  }
  throw new Error(`Could not build a sound sign-rule question for level ${level.id}`);
}

/** One full session: eight questions, discovery first and division last. */
export function buildSignRulesChallenges(): SignRuleChallenge[] {
  const taken = new Set<string>();
  return LEVELS.map((level) => buildChallenge(level, taken));
}
