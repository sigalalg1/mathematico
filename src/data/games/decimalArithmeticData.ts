/**
 * Grade 4 Decimal Place Value — Skill 5: Addition, Subtraction and
 * Regrouping (חיבור וחיסור במבנה העשרוני).
 *
 * The one skill in this unit where speed is a genuinely relevant part of
 * the goal (computational fluency, not conceptual reasoning), so unlike
 * every other skill here it supports Personal Challenge, with 50 questions
 * as an eligible length — matching the arithmetic-fluency precedent
 * elsewhere in the app.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { toTrainingQuestion } from '../../utils/placeValueQuestion';
import { digitAt, formatNumber, PLACE_VALUES } from '../../utils/placeValue';
import type { PlaceValueDifficulty, PlaceValueQuestion } from '../../types/placeValue';

export const DECIMAL_ARITHMETIC_ID = 'decimalArithmetic';
export const DECIMAL_ARITHMETIC_RULES_VERSION = 1;

type TemplateId = 'roundAddSubtract' | 'multiDigitAdd' | 'multiDigitSubtract' | 'zeroSubtract' | 'missingAddend';

interface DifficultySpec {
  templates: TemplateId[];
  numberRange: [number, number];
}

const DIFFICULTY_SPECS: Record<PlaceValueDifficulty, DifficultySpec> = {
  basic: {
    templates: ['roundAddSubtract'],
    numberRange: [1000, 9999],
  },
  intermediate: {
    templates: ['multiDigitAdd', 'multiDigitSubtract'],
    numberRange: [1000, 99999],
  },
  advanced: {
    templates: ['multiDigitAdd', 'multiDigitSubtract', 'zeroSubtract', 'missingAddend'],
    numberRange: [10000, 999999],
  },
};

function requiresBorrowing(a: number, b: number): boolean {
  return PLACE_VALUES.some((place) => digitAt(a, place) < digitAt(b, place));
}

function requiresCarrying(a: number, b: number): boolean {
  return PLACE_VALUES.some((place) => digitAt(a, place) + digitAt(b, place) >= 10);
}

function buildRoundAddSubtractQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const roundUnit = randomOf(random, [10, 100, 1000] as const);
  const a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const isAdd = randomOf(random, [true, false]);
  // Subtraction must never go negative — cap how many `roundUnit`s can be
  // taken away at how many actually fit inside `a`.
  const maxMultiples = isAdd ? 9 : Math.max(1, Math.min(9, Math.floor(a / roundUnit)));
  const bMultiples = randomInt(random, 1, maxMultiples);
  const b = bMultiples * roundUnit;
  const correct = isAdd ? a + b : a - b;

  return {
    id: `arith-round-${a}-${isAdd ? '+' : '-'}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'arithmetic',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(a)} ${isAdd ? '+' : '−'} ${formatNumber(b)}`,
    displayMode: 'vertical',
    promptKey: 'decimalArithmetic.promptFor.calculate',
    explanationKey: 'decimalArithmetic.explanation.calculate',
    explanationParams: { result: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildMultiDigitAddQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  let a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  let b = randomInt(random, spec.numberRange[0], Math.floor(spec.numberRange[1] / 2));
  let guard = 0;
  while (!requiresCarrying(a, b) && guard < 300) {
    guard += 1;
    a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
    b = randomInt(random, spec.numberRange[0], Math.floor(spec.numberRange[1] / 2));
  }
  const correct = a + b;

  return {
    id: `arith-add-${a}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'arithmetic',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(a)} + ${formatNumber(b)}`,
    displayMode: 'vertical',
    promptKey: 'decimalArithmetic.promptFor.calculate',
    explanationKey: 'decimalArithmetic.explanation.calculate',
    explanationParams: { result: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildMultiDigitSubtractQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  let a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  let b = randomInt(random, spec.numberRange[0], a);
  let guard = 0;
  while ((!requiresBorrowing(a, b) || a - b < 0) && guard < 300) {
    guard += 1;
    a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
    b = randomInt(random, spec.numberRange[0], a);
  }
  const correct = a - b;

  return {
    id: `arith-sub-${a}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'arithmetic',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(a)} − ${formatNumber(b)}`,
    displayMode: 'vertical',
    promptKey: 'decimalArithmetic.promptFor.calculate',
    explanationKey: 'decimalArithmetic.explanation.calculate',
    explanationParams: { result: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildZeroSubtractQuestion(difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  // Subtraction that crosses one or more zeros, e.g. 9,000 − 8,999 — the
  // classic "every place has to borrow" case.
  const place = randomOf(random, [1000, 10000, 100000] as const);
  const a = place * randomInt(random, 1, 9);
  const b = a - randomInt(random, 1, Math.min(999, place - 1));
  const correct = a - b;

  return {
    id: `arith-zero-${a}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'arithmetic',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(a)} − ${formatNumber(b)}`,
    displayMode: 'vertical',
    promptKey: 'decimalArithmetic.promptFor.calculate',
    explanationKey: 'decimalArithmetic.explanation.calculate',
    explanationParams: { result: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildMissingAddendQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const total = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const known = randomInt(random, 1, total - 1);
  const missing = total - known;

  return {
    id: `arith-missing-${known}-${total}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'arithmetic',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `___ + ${formatNumber(known)} = ${formatNumber(total)}`,
    promptKey: 'decimalArithmetic.promptFor.missingAddend',
    explanationKey: 'decimalArithmetic.explanation.missingAddend',
    explanationParams: { total: formatNumber(total), known: formatNumber(known), missing: formatNumber(missing) },
    correctAnswerDisplay: String(missing),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === missing,
  };
}

function buildQuestion(difficultyId: string | null, random: RandomSource): PlaceValueQuestion {
  const difficulty = (difficultyId ?? 'basic') as PlaceValueDifficulty;
  const spec = DIFFICULTY_SPECS[difficulty] ?? DIFFICULTY_SPECS.basic;
  const template = randomOf(random, spec.templates);

  if (template === 'roundAddSubtract') return buildRoundAddSubtractQuestion(spec, difficulty, random);
  if (template === 'multiDigitAdd') return buildMultiDigitAddQuestion(spec, difficulty, random);
  if (template === 'multiDigitSubtract') return buildMultiDigitSubtractQuestion(spec, difficulty, random);
  if (template === 'zeroSubtract') return buildZeroSubtractQuestion(difficulty, random);
  return buildMissingAddendQuestion(spec, difficulty, random);
}

export function buildArithmeticQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<PlaceValueQuestion>[] {
  return Array.from({ length: count }, () => toTrainingQuestion(buildQuestion(difficultyId, random)));
}

export const decimalArithmeticActivity: TrainingActivityDefinition<PlaceValueQuestion> = {
  id: DECIMAL_ARITHMETIC_ID,
  i18nPrefix: 'decimalArithmetic',
  capabilities: {
    questionCounts: [5, 10, 20, 50],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'decimalArithmetic.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'decimalArithmetic.difficulty.intermediate' },
      { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'decimalArithmetic.difficulty.advanced' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: true,
    challengeQuestionCounts: [20, 50],
    paceRecordMinAccuracy: 1,
    rulesVersion: DECIMAL_ARITHMETIC_RULES_VERSION,
  },
  generateQuestions: (input) => buildArithmeticQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertArithmeticQuestionIsSound(question: PlaceValueQuestion): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid arithmetic question (${question.id}): ${reason}`);
  };

  if (!question.validate(question.correctAnswerDisplay)) fail("the question's own correctAnswerDisplay does not validate");
  if (Number(question.correctAnswerDisplay) < 0) fail('a negative result — Grade 4 subtraction never goes negative');

  if (question.interaction.kind === 'multipleChoice') {
    const { options } = question.interaction;
    if (new Set(options).size !== options.length) fail('duplicate options');
    const correctCount = options.filter((option) => question.validate(option)).length;
    if (correctCount !== 1) fail(`expected exactly one correct option, found ${correctCount}`);
  }
}

// Exported for tests that want to independently verify the regrouping guards.
export { requiresBorrowing, requiresCarrying };
