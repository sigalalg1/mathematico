/**
 * Grade 7 Algebra — Activity 7: Solving Equations (פותרים משוואות).
 *
 * The procedure, but built so it can never drift from the meaning the
 * previous activity established: every step is "do the same thing to both
 * sides", chosen from a small menu rather than typed, and applied to the
 * whole equation at once — there is no way to represent "only one side" in
 * this model, so equality can never silently break.
 *
 * `buildCanonicalPath` derives the *exact* step sequence a textbook would
 * teach (clear the constant, eliminate x from one side if it appears on
 * both, then divide by the coefficient) directly from the equation's own
 * numbers — it is never authored by hand per question, so it can never
 * disagree with the equation it was built from.
 *
 * Levels A–D from the spec (one operation, two steps, signed numbers,
 * variable on both sides). Level E (parentheses) is intentionally out of
 * scope for v1 — see the final report.
 */
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { satisfiesEquation, solveLinearEquation, type LinearEquation, type LinearExpr } from '../../utils/algebra';
import { shuffle } from '../../utils/shuffle';

export type LinearOperation =
  | { kind: 'linear'; coefficientDelta: number; constantDelta: number }
  | { kind: 'divide'; divisor: number };

export interface SolveChallenge {
  id: string;
  level: 'A' | 'B' | 'C' | 'D';
  equation: LinearEquation;
  solution: number;
  /** The exact step sequence a correct solve follows, derived from the equation itself. */
  canonicalPath: LinearOperation[];
}

const OPTION_COUNT = 3;

/** `-0` is mathematically `0` but fails strict/structural equality against it — never let it leak out. */
function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

export function applyOperation(expr: LinearExpr, operation: LinearOperation): LinearExpr {
  if (operation.kind === 'linear') {
    return {
      coefficient: normalizeZero(expr.coefficient + operation.coefficientDelta),
      constant: normalizeZero(expr.constant + operation.constantDelta),
    };
  }
  return {
    coefficient: normalizeZero(expr.coefficient / operation.divisor),
    constant: normalizeZero(expr.constant / operation.divisor),
  };
}

export function applyOperationToEquation(equation: LinearEquation, operation: LinearOperation): LinearEquation {
  return { left: applyOperation(equation.left, operation), right: applyOperation(equation.right, operation) };
}

function operationsEqual(a: LinearOperation, b: LinearOperation): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'linear' && b.kind === 'linear'
    ? a.coefficientDelta === b.coefficientDelta && a.constantDelta === b.constantDelta
    : a.kind === 'divide' && b.kind === 'divide' && a.divisor === b.divisor;
}

/**
 * The canonical solve: eliminate x from the right side first (if present),
 * then clear the left side's constant, then divide by whatever coefficient
 * remains. Each step is derived from the equation state at that point, so it
 * is correct by construction rather than asserted.
 */
export function buildCanonicalPath(start: LinearEquation): LinearOperation[] {
  const ops: LinearOperation[] = [];
  let state = start;

  if (state.right.coefficient !== 0) {
    const op: LinearOperation = { kind: 'linear', coefficientDelta: -state.right.coefficient, constantDelta: 0 };
    ops.push(op);
    state = applyOperationToEquation(state, op);
  }

  if (state.left.constant !== 0) {
    const op: LinearOperation = { kind: 'linear', coefficientDelta: 0, constantDelta: -state.left.constant };
    ops.push(op);
    state = applyOperationToEquation(state, op);
  }

  if (state.left.coefficient !== 1) {
    ops.push({ kind: 'divide', divisor: state.left.coefficient });
  }

  return ops;
}

/** Plausible-but-wrong moves to offer alongside the real next step. */
function buildStepOptions(correct: LinearOperation, current: LinearEquation, random: RandomSource): LinearOperation[] {
  const candidates: LinearOperation[] = [correct];

  if (correct.kind === 'linear') {
    // The sign-flip slip: adding instead of subtracting, or the reverse.
    candidates.push({ kind: 'linear', coefficientDelta: -correct.coefficientDelta, constantDelta: -correct.constantDelta });
    // Reaching for division before the constant/x term is actually cleared.
    // Dividing by 1 (or 0) would not actually be a distractor — it either
    // does nothing or is illegal, so it falls back to a generic divisor.
    const divisor = Math.abs(current.left.coefficient) > 1 ? current.left.coefficient : 2;
    candidates.push({ kind: 'divide', divisor });
  } else {
    // Multiplying instead of dividing (the inverse operation).
    candidates.push({ kind: 'divide', divisor: -correct.divisor });
    // Trying to clear a constant that is not actually what is blocking x.
    const constantDelta = current.left.constant !== 0 ? -current.left.constant : current.right.constant || 1;
    candidates.push({ kind: 'linear', coefficientDelta: 0, constantDelta });
  }

  const unique: LinearOperation[] = [];
  for (const candidate of candidates) {
    if (unique.some((existing) => operationsEqual(existing, candidate))) continue;
    unique.push(candidate);
    if (unique.length === OPTION_COUNT) break;
  }
  // A fallback filler on the rare chance two candidates collapsed to the same move.
  let guard = 0;
  while (unique.length < OPTION_COUNT && guard < 50) {
    guard += 1;
    const filler: LinearOperation = { kind: 'linear', coefficientDelta: 0, constantDelta: randomInt(random, 1, 9) * randomOf(random, [-1, 1]) };
    if (!unique.some((existing) => operationsEqual(existing, filler))) unique.push(filler);
  }

  return shuffle(unique, random);
}

export function stepOptionsFor(challenge: SolveChallenge, stepIndex: number, random: RandomSource = Math.random): LinearOperation[] {
  let state = challenge.equation;
  for (let i = 0; i < stepIndex; i += 1) state = applyOperationToEquation(state, challenge.canonicalPath[i]);
  return buildStepOptions(challenge.canonicalPath[stepIndex], state, random);
}

interface LevelSpec {
  level: SolveChallenge['level'];
  /** Whether the right side also carries an x-term (variable on both sides). */
  variableOnBothSides: boolean;
  coefficientRange: [number, number];
  constantRange: [number, number];
  solutionRange: [number, number];
  /** When true, the left coefficient is always 1 or the constant is always 0 (one operation only). */
  singleOperation: boolean;
}

const LEVELS: LevelSpec[] = [
  { level: 'A', variableOnBothSides: false, coefficientRange: [1, 1], constantRange: [1, 9], solutionRange: [1, 12], singleOperation: true },
  { level: 'A', variableOnBothSides: false, coefficientRange: [2, 6], constantRange: [0, 0], solutionRange: [1, 9], singleOperation: true },
  { level: 'B', variableOnBothSides: false, coefficientRange: [2, 5], constantRange: [1, 9], solutionRange: [1, 9], singleOperation: false },
  { level: 'B', variableOnBothSides: false, coefficientRange: [2, 5], constantRange: [-9, -1], solutionRange: [1, 9], singleOperation: false },
  { level: 'C', variableOnBothSides: false, coefficientRange: [1, 1], constantRange: [-9, -1], solutionRange: [-9, -1], singleOperation: true },
  { level: 'C', variableOnBothSides: false, coefficientRange: [-6, -2], constantRange: [1, 9], solutionRange: [-9, -1], singleOperation: false },
  { level: 'D', variableOnBothSides: true, coefficientRange: [3, 6], constantRange: [-9, 9], solutionRange: [1, 9], singleOperation: false },
  { level: 'D', variableOnBothSides: true, coefficientRange: [3, 6], constantRange: [-9, 9], solutionRange: [-9, -1], singleOperation: false },
];

function nonZero(random: RandomSource, range: [number, number]): number {
  let value = randomInt(random, range[0], range[1]);
  while (value === 0) value = randomInt(random, range[0], range[1]);
  return value;
}

function buildEquation(spec: LevelSpec, random: RandomSource): { equation: LinearEquation; solution: number } {
  const solution = randomInt(random, spec.solutionRange[0], spec.solutionRange[1]);
  const coefficient = spec.coefficientRange[0] === spec.coefficientRange[1] ? spec.coefficientRange[0] : nonZero(random, spec.coefficientRange);
  const constant = spec.singleOperation
    ? spec.coefficientRange[0] === 1
      ? randomInt(random, spec.constantRange[0], spec.constantRange[1])
      : 0
    : nonZero(random, spec.constantRange);

  if (!spec.variableOnBothSides) {
    const target = coefficient * solution + constant;
    return { equation: { left: { coefficient, constant }, right: { coefficient: 0, constant: target } }, solution };
  }

  // Variable on both sides: pick a distinct right-side coefficient smaller
  // than the left's, so eliminating it never flips the leading sign.
  const rightCoefficient = randomInt(random, 1, coefficient - 1);
  const rightConstant = randomInt(random, spec.constantRange[0], spec.constantRange[1]);
  // Solve `coefficient*solution + leftConstant = rightCoefficient*solution + rightConstant` for leftConstant.
  const leftConstant = rightConstant - (coefficient - rightCoefficient) * solution;
  return {
    equation: { left: { coefficient, constant: leftConstant }, right: { coefficient: rightCoefficient, constant: rightConstant } },
    solution,
  };
}

export const SOLVING_TOTAL = LEVELS.length;

export function buildSolveChallenges(random: RandomSource = Math.random): SolveChallenge[] {
  return LEVELS.map((spec, index) => {
    const { equation, solution } = buildEquation(spec, random);
    const canonicalPath = buildCanonicalPath(equation);
    return { id: `solve-${spec.level}-${index}`, level: spec.level, equation, solution, canonicalPath };
  });
}

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertSolveChallengeIsSound(challenge: SolveChallenge): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid solving question (${challenge.id}): ${reason}`);
  };

  const solved = solveLinearEquation(challenge.equation);
  if (solved === null) fail('the equation has no unique solution');
  if (solved !== challenge.solution) fail(`the stated solution (${challenge.solution}) does not match solving the equation (${solved})`);
  if (!satisfiesEquation(challenge.equation, challenge.solution)) fail('the solution does not satisfy the original equation');

  if (challenge.canonicalPath.length === 0) fail('empty canonical path');

  // Replaying every step from the original equation must land exactly on
  // "x = solution" — the whole point of deriving the path from the equation.
  let state = challenge.equation;
  for (const operation of challenge.canonicalPath) {
    if (operation.kind === 'divide' && operation.divisor === 0) fail('a divide-by-zero step');
    state = applyOperationToEquation(state, operation);
  }
  if (state.left.coefficient !== 1 || state.left.constant !== 0) fail('the path does not finish with a bare x on the left');
  if (state.right.coefficient !== 0) fail('the path leaves x on the right side');
  if (state.right.constant !== challenge.solution) fail('the path finishes on the wrong value');

  if (challenge.level === 'D' && challenge.equation.right.coefficient === 0) fail("level D must have x on both sides");
  if (challenge.level !== 'D' && challenge.equation.right.coefficient !== 0) fail('only level D should have x on both sides');
}

/** Every option offered for a step must itself be a legal both-sides move (never a no-op, never undefined). */
export function assertStepOptionsAreSound(options: LinearOperation[], correct: LinearOperation): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid step options: ${reason}`);
  };
  if (options.length !== OPTION_COUNT) fail(`expected ${OPTION_COUNT} options, got ${options.length}`);
  if (!options.some((option) => operationsEqual(option, correct))) fail('the correct operation is not among the offered options');
  const signatures = options.map((option) => JSON.stringify(option));
  if (new Set(signatures).size !== signatures.length) fail('duplicate step options');
  for (const option of options) {
    if (option.kind === 'divide' && option.divisor === 0) fail('an option divides by zero');
    if (option.kind === 'divide' && option.divisor === 1) fail('an option divides by 1 — a no-op offered as if it were a real move');
    if (option.kind === 'linear' && option.coefficientDelta === 0 && option.constantDelta === 0) fail('an option that does nothing');
  }
}

export function formatOperation(operation: LinearOperation, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (operation.kind === 'divide') return t('algebraSolving.operation.divide', { n: operation.divisor });
  if (operation.coefficientDelta !== 0) {
    const magnitude = Math.abs(operation.coefficientDelta);
    const term = magnitude === 1 ? 'x' : `${magnitude}x`;
    return operation.coefficientDelta > 0 ? t('algebraSolving.operation.addX', { term }) : t('algebraSolving.operation.subtractX', { term });
  }
  return operation.constantDelta > 0
    ? t('algebraSolving.operation.add', { n: operation.constantDelta })
    : t('algebraSolving.operation.subtract', { n: Math.abs(operation.constantDelta) });
}
