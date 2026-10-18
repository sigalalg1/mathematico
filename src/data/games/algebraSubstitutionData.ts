/**
 * Grade 7 Algebra — Activity 3: Substitution (הצבה בביטויים).
 *
 * An expression receives a numeric value once its variable is assigned one.
 * The question itself is a simple "evaluate this" multiple-choice drill, but
 * the point of the activity is the feedback: every answer — right or wrong —
 * is followed by the full replacement-then-compute derivation
 * (`formatSubstitutionSteps`), so the expression never silently becomes a
 * number without the step that explains why.
 *
 * Training Mode, practice only (`supportsChallenge: false`): this is about
 * getting the replacement step right, not about speed.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { evalLinearExpr, formatLinearExpr, type LinearExpr } from '../../utils/algebra';
import { shuffle } from '../../utils/shuffle';

export const ALGEBRA_SUBSTITUTION_ID = 'algebraSubstitution';
export const ALGEBRA_SUBSTITUTION_RULES_VERSION = 1;

export interface SubstitutionPayload {
  expr: LinearExpr;
  x: number;
}

const OPTION_COUNT = 4;

interface DifficultySpec {
  /** Whether the coefficient is always 1 (so the question is "x ± a" only). */
  singleOperation: boolean;
  coefficientRange: [number, number];
  constantRange: [number, number];
  xRange: [number, number];
}

const DIFFICULTY_SPECS: Record<string, DifficultySpec> = {
  basic: { singleOperation: true, coefficientRange: [1, 4], constantRange: [-9, 9], xRange: [1, 9] },
  intermediate: { singleOperation: false, coefficientRange: [2, 5], constantRange: [-9, 9], xRange: [1, 9] },
  // Deliberately reuses the Signed Numbers unit's own territory: a negative x.
  hard: { singleOperation: false, coefficientRange: [2, 5], constantRange: [-9, 9], xRange: [-9, -1] },
};

function buildExpr(spec: DifficultySpec, random: RandomSource): LinearExpr {
  const coefficient = spec.singleOperation ? randomOf(random, [1, 3]) : randomInt(random, spec.coefficientRange[0], spec.coefficientRange[1]);

  if (spec.singleOperation) {
    // Either "x ± a" (coefficient 1) or "ax" (constant 0) — never both at
    // once, or it stops being a single operation.
    const constant = coefficient === 1 ? randomInt(random, 1, 9) : 0;
    return { coefficient, constant };
  }

  // A two-operation question must keep both operations — a constant of 0
  // would silently collapse it back down to "ax".
  let constant = randomInt(random, spec.constantRange[0], spec.constantRange[1]);
  while (constant === 0) constant = randomInt(random, spec.constantRange[0], spec.constantRange[1]);
  return { coefficient, constant };
}

function uniqueNumericOptions(random: RandomSource, correct: number, spread: number): string[] {
  const values = new Set<number>([correct]);
  let guard = 0;
  while (values.size < OPTION_COUNT && guard < 200) {
    guard += 1;
    values.add(correct + randomInt(random, 1, spread) * randomOf(random, [-1, 1]));
  }
  return shuffle([...values].map((value) => String(value)), random);
}

function buildQuestion(difficultyId: string | null, random: RandomSource): TrainingQuestion<SubstitutionPayload> {
  const spec = DIFFICULTY_SPECS[difficultyId ?? 'basic'] ?? DIFFICULTY_SPECS.basic;
  const expr = buildExpr(spec, random);
  const x = randomInt(random, spec.xRange[0], spec.xRange[1]);
  const answer = evalLinearExpr(expr, x);

  // The two classic substitution slips, offered deliberately when they apply
  // rather than left to chance: forgetting to multiply by the coefficient,
  // and mishandling the sign of a negative x. Generic numeric noise fills in
  // the rest, never displacing these.
  const priority = new Set<number>();
  if (expr.coefficient !== 1) priority.add(x + expr.constant);
  if (x < 0) priority.add(expr.coefficient * Math.abs(x) + expr.constant);
  priority.delete(answer);

  const spread = Math.max(3, Math.abs(expr.coefficient) + 2);
  const filler = uniqueNumericOptions(random, answer, spread)
    .map(Number)
    .filter((value) => value !== answer && !priority.has(value));

  const numericOptions = [answer, ...priority, ...filler].filter((value, index, array) => array.indexOf(value) === index);
  let guard = 0;
  while (numericOptions.length < OPTION_COUNT && guard < 200) {
    guard += 1;
    const candidate = answer + randomInt(random, 1, spread + guard);
    if (!numericOptions.includes(candidate)) numericOptions.push(candidate);
  }
  const options = numericOptions.slice(0, OPTION_COUNT).map(String);

  return {
    id: `sub-${expr.coefficient}-${expr.constant}-${x}-${Math.floor(random() * 1_000_000)}`,
    prompt: `${formatLinearExpr(expr)}, x=${x}`,
    answer: String(answer),
    options: shuffle(options, random),
    payload: { expr, x },
  };
}

export function buildSubstitutionQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<SubstitutionPayload>[] {
  return Array.from({ length: count }, () => buildQuestion(difficultyId, random));
}

export const algebraSubstitutionActivity: TrainingActivityDefinition<SubstitutionPayload> = {
  id: ALGEBRA_SUBSTITUTION_ID,
  i18nPrefix: 'algebraSubstitution',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'algebraSubstitution.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'algebraSubstitution.difficulty.intermediate' },
      { id: 'hard', labelKey: 'training.difficulty.hard', descriptionKey: 'algebraSubstitution.difficulty.hard' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: ALGEBRA_SUBSTITUTION_RULES_VERSION,
  },
  generateQuestions: (input) => buildSubstitutionQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertSubstitutionQuestionIsSound(question: TrainingQuestion<SubstitutionPayload>): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid substitution question (${question.id}): ${reason}`);
  };

  if (!question.payload) fail('missing payload');
  const { expr, x } = question.payload!;

  if (new Set(question.options).size !== question.options.length) fail('duplicate options');
  if (question.options.length === 0) fail('no options');
  if (!question.options.includes(question.answer)) fail('the answer is not among its own options');
  if (String(evalLinearExpr(expr, x)) !== question.answer) fail('the answer does not match evaluating the expression at x');
}
