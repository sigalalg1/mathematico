/**
 * Grade 7 Algebra — Activity 1: Patterns & Variables (חוקיות ומשתנים).
 *
 * The unit's opening activity, and the one piece of pedagogy every later
 * activity leans on: a variable is not an arbitrary symbol, it is "any
 * number" put through the same rule a specific number just went through.
 * Every question is built around one `input -> ×a -> (+/-)b -> output`
 * machine (a `LinearExpr`), shown first with a couple of worked numeric
 * examples so the algebra, when it finally appears, is a restatement of
 * something already demonstrated — never a new unexplained symbol.
 *
 * A fixed eight-question progression (mirroring the Signed Numbers unit's
 * `LEVELS` pattern), not a repeatable drill: this activity is meant to be
 * walked once as a coherent introduction, so it uses `useChallengeRound`
 * rather than Training Mode.
 */
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { evalLinearExpr, formatLinearExpr, type LinearExpr } from '../../utils/algebra';
import { shuffle } from '../../utils/shuffle';

export type PatternQuestionKind = 'computeOutput' | 'computeRule' | 'computeInput' | 'visualStage';

export interface PatternChallenge {
  id: string;
  kind: PatternQuestionKind;
  expr: LinearExpr;
  /** A couple of worked numeric examples the machine already produced. */
  knownPairs: { input: number; output: number }[];
  /** Set only for the question kind that uses it; `null` otherwise. */
  targetInput: number | null;
  targetOutput: number | null;
  stage: number | null;
  options: string[];
  answer: string;
}

const OPTION_COUNT = 4;

function uniqueNumericOptions(random: RandomSource, correct: number, spreadMax: number): string[] {
  const values = new Set<number>([correct]);
  let guard = 0;
  while (values.size < OPTION_COUNT && guard < 200) {
    guard += 1;
    const delta = randomInt(random, 1, spreadMax) * randomOf(random, [-1, 1]);
    const candidate = correct + delta;
    values.add(candidate);
  }
  return shuffle([...values].map((value) => String(value)), random);
}

function uniqueExpressionOptions(random: RandomSource, correct: LinearExpr): string[] {
  const seen = new Set<string>([formatLinearExpr(correct)]);
  const options: LinearExpr[] = [correct];
  let guard = 0;
  while (options.length < OPTION_COUNT && guard < 200) {
    guard += 1;
    // Perturb exactly one of coefficient/constant, the two mistakes a
    // student actually makes (the other operation, or the other number).
    const perturbCoefficient = randomOf(random, [true, false]);
    const candidate: LinearExpr = perturbCoefficient
      ? { coefficient: correct.coefficient + randomOf(random, [-2, -1, 1, 2]), constant: correct.constant }
      : { coefficient: correct.coefficient, constant: correct.constant + randomOf(random, [-3, -2, -1, 1, 2, 3]) };
    if (candidate.coefficient === 0) continue; // never offer "x doesn't matter" as a distractor
    const text = formatLinearExpr(candidate);
    if (seen.has(text)) continue;
    seen.add(text);
    options.push(candidate);
  }
  return shuffle(options.map((expr) => formatLinearExpr(expr)), random);
}

interface LevelSpec {
  id: string;
  kind: PatternQuestionKind;
  coefficientRange: [number, number];
  constantRange: [number, number];
  inputRange: [number, number];
}

/**
 * Eight questions walking the progression the unit prose lays out: specific
 * numbers through a machine, the same machine described for "any number",
 * then reading the machine back out of an expression, and finally a simple
 * growing visual pattern as a second, non-numeric way to meet the same idea.
 */
const LEVELS: LevelSpec[] = [
  { id: 'q1', kind: 'computeOutput', coefficientRange: [2, 4], constantRange: [0, 0], inputRange: [2, 10] },
  { id: 'q2', kind: 'computeOutput', coefficientRange: [2, 4], constantRange: [1, 6], inputRange: [2, 10] },
  { id: 'q3', kind: 'computeRule', coefficientRange: [2, 5], constantRange: [0, 0], inputRange: [2, 8] },
  { id: 'q4', kind: 'computeRule', coefficientRange: [2, 4], constantRange: [1, 7], inputRange: [2, 8] },
  { id: 'q5', kind: 'computeRule', coefficientRange: [2, 4], constantRange: [-7, -1], inputRange: [2, 8] },
  { id: 'q6', kind: 'computeInput', coefficientRange: [2, 4], constantRange: [1, 6], inputRange: [2, 8] },
  { id: 'q7', kind: 'computeOutput', coefficientRange: [2, 4], constantRange: [-6, 6], inputRange: [-6, -2] },
  { id: 'q8', kind: 'visualStage', coefficientRange: [2, 4], constantRange: [1, 5], inputRange: [4, 6] },
];

function buildExprFor(level: LevelSpec, random: RandomSource): LinearExpr {
  const coefficient = randomInt(random, level.coefficientRange[0], level.coefficientRange[1]);
  const constant = randomInt(random, level.constantRange[0], level.constantRange[1]);
  return { coefficient, constant };
}

function buildKnownPairs(expr: LinearExpr, random: RandomSource, inputRange: [number, number], count: number): { input: number; output: number }[] {
  const inputs = new Set<number>();
  let guard = 0;
  while (inputs.size < count && guard < 200) {
    guard += 1;
    inputs.add(randomInt(random, inputRange[0], inputRange[1]));
  }
  return [...inputs].sort((a, b) => a - b).map((input) => ({ input, output: evalLinearExpr(expr, input) }));
}

function buildChallenge(level: LevelSpec, random: RandomSource): PatternChallenge {
  const expr = buildExprFor(level, random);
  const base = { id: level.id, kind: level.kind, expr, targetInput: null, targetOutput: null, stage: null };

  if (level.kind === 'computeOutput') {
    const knownPairs = buildKnownPairs(expr, random, level.inputRange, 3);
    // The question itself asks about a fresh input the worked examples didn't use.
    let targetInput = randomInt(random, level.inputRange[0], level.inputRange[1]);
    while (knownPairs.some((pair) => pair.input === targetInput)) {
      targetInput = randomInt(random, level.inputRange[0], level.inputRange[1]);
    }
    const answer = evalLinearExpr(expr, targetInput);
    return {
      ...base,
      knownPairs,
      targetInput,
      options: uniqueNumericOptions(random, answer, Math.max(3, Math.abs(expr.coefficient) + 1)),
      answer: String(answer),
    };
  }

  if (level.kind === 'computeRule') {
    const knownPairs = buildKnownPairs(expr, random, level.inputRange, 3);
    return {
      ...base,
      knownPairs,
      options: uniqueExpressionOptions(random, expr),
      answer: formatLinearExpr(expr),
    };
  }

  if (level.kind === 'computeInput') {
    const knownPairs = buildKnownPairs(expr, random, level.inputRange, 2);
    // Pick the target the other way round, from a clean input, so the
    // division to recover it is always exact.
    let targetInput = randomInt(random, level.inputRange[0], level.inputRange[1]);
    while (knownPairs.some((pair) => pair.input === targetInput)) {
      targetInput = randomInt(random, level.inputRange[0], level.inputRange[1]);
    }
    const targetOutput = evalLinearExpr(expr, targetInput);
    return {
      ...base,
      knownPairs,
      targetOutput,
      options: uniqueNumericOptions(random, targetInput, 3),
      answer: String(targetInput),
    };
  }

  // visualStage: the pattern grows by `coefficient` each stage, starting from
  // `coefficient + constant` at stage 1 — i.e. `expr` evaluated at the stage
  // number itself, exactly like every other question kind here.
  const stage = randomInt(random, level.inputRange[0], level.inputRange[1]);
  const knownPairs = buildKnownPairs(expr, random, [1, 3], 3);
  const answer = evalLinearExpr(expr, stage);
  return {
    ...base,
    knownPairs,
    stage,
    options: uniqueNumericOptions(random, answer, Math.max(3, expr.coefficient + 1)),
    answer: String(answer),
  };
}

export const PATTERNS_TOTAL = LEVELS.length;

export function buildPatternChallenges(random: RandomSource = Math.random): PatternChallenge[] {
  return LEVELS.map((level) => buildChallenge(level, random));
}

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertPatternChallengeIsSound(challenge: PatternChallenge): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid pattern question (${challenge.id}): ${reason}`);
  };

  if (challenge.expr.coefficient === 0) fail('a coefficient of 0 makes x meaningless');
  if (new Set(challenge.options).size !== challenge.options.length) fail('duplicate options');
  if (!challenge.options.includes(challenge.answer)) fail('the answer is not among its own options');
  if (challenge.options.length !== OPTION_COUNT) fail(`expected ${OPTION_COUNT} options, got ${challenge.options.length}`);

  for (const pair of challenge.knownPairs) {
    if (evalLinearExpr(challenge.expr, pair.input) !== pair.output) fail('a worked example does not match its own rule');
  }

  if (challenge.kind === 'computeOutput' || challenge.kind === 'visualStage') {
    const input = challenge.kind === 'visualStage' ? challenge.stage : challenge.targetInput;
    if (input === null) fail('missing the input the question asks about');
    else if (String(evalLinearExpr(challenge.expr, input)) !== challenge.answer) fail('the answer does not match the rule at that input');
  }

  if (challenge.kind === 'computeInput') {
    if (challenge.targetOutput === null) fail('missing the target output');
    if (String(evalLinearExpr(challenge.expr, Number(challenge.answer))) !== String(challenge.targetOutput)) {
      fail('the recovered input does not actually produce the stated output');
    }
  }

  if (challenge.kind === 'computeRule' && challenge.answer !== formatLinearExpr(challenge.expr)) {
    fail('the answer does not match the rule');
  }
}
