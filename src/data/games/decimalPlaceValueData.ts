/**
 * Grade 4 Decimal Place Value — Skill 1: Place Value and Conversions
 * (המבנה העשרוני והמרות).
 *
 * Deliberately never reduces to "which position is the digit in" alone: a
 * digit-value question always names the PLACE, never the digit itself (so
 * "the value of the hundreds digit in 463,205" rather than "the value of 6
 * in 463,205" — a number can repeat a digit, which would make the second
 * phrasing genuinely ambiguous), and conversion questions go both
 * directions (count the units in a number, and build a number from a count
 * of units) at ranges that force real base-10 structural reasoning, not
 * just reading off a digit.
 *
 * Every prompt that needs to name a place in words (e.g. "how many TENS")
 * uses a place-specific i18n key (`decimalPlaceValue.promptFor.countUnit.tens`,
 * `...hundreds`, ...) rather than interpolating a translated word at
 * runtime — the generator has no access to `t()`, so the choice of *which*
 * translated string to show is made by picking the key, the same pattern
 * the Algebra unit's phrase-based questions use. Explanations stay purely
 * numeric (e.g. "100 × 23 = 2,300") for the same reason, and because the
 * arithmetic relationship is clearer than a sentence anyway.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { numericMultipleChoice, toTrainingQuestion } from '../../utils/placeValueQuestion';
import { composeFromUnits, countOfUnit, digitAt, formatNumber, placeNameFor, valueAt, type PlaceValue } from '../../utils/placeValue';
import type { PlaceValueDifficulty, PlaceValueQuestion } from '../../types/placeValue';

export const DECIMAL_PLACE_VALUE_ID = 'decimalPlaceValue';
export const DECIMAL_PLACE_VALUE_RULES_VERSION = 1;

type TemplateId = 'digitValue' | 'countUnit' | 'composeUnit';

interface DifficultySpec {
  templates: TemplateId[];
  digitValuePlaces: PlaceValue[];
  numberRange: [number, number];
  units: PlaceValue[];
  /** Whether countUnit numbers must divide the unit exactly (no remainder to reason past). */
  exactMultiplesOnly: boolean;
}

const DIFFICULTY_SPECS: Record<PlaceValueDifficulty, DifficultySpec> = {
  basic: {
    templates: ['digitValue', 'composeUnit'],
    digitValuePlaces: [10, 100],
    numberRange: [100, 9999],
    units: [10, 100],
    exactMultiplesOnly: true,
  },
  intermediate: {
    templates: ['digitValue', 'countUnit', 'composeUnit'],
    digitValuePlaces: [1000, 10000],
    numberRange: [1000, 99999],
    units: [10, 100, 1000],
    exactMultiplesOnly: true,
  },
  advanced: {
    templates: ['digitValue', 'countUnit', 'composeUnit'],
    digitValuePlaces: [10000, 100000],
    numberRange: [10000, 999999],
    units: [100, 1000, 10000],
    exactMultiplesOnly: false,
  },
};

function randomNumberWithNonzeroDigitAt(random: RandomSource, range: [number, number], place: PlaceValue): number {
  let n = randomInt(random, range[0], range[1]);
  let guard = 0;
  while (digitAt(n, place) === 0 && guard < 200) {
    guard += 1;
    n = randomInt(random, range[0], range[1]);
  }
  return n;
}

function buildDigitValueQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const place = randomOf(random, spec.digitValuePlaces);
  const n = randomNumberWithNonzeroDigitAt(random, spec.numberRange, place);
  const correct = valueAt(n, place);
  const options = numericMultipleChoice(random, correct, Math.max(10, place));

  return {
    id: `pv-digit-${n}-${place}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'placeValue',
    difficulty,
    interaction: { kind: 'multipleChoice', options },
    display: formatNumber(n),
    promptKey: `decimalPlaceValue.promptFor.digitValue.${placeNameFor(place)}`,
    explanationKey: 'decimalPlaceValue.explanation.digitValue',
    explanationParams: { digit: digitAt(n, place), placeValue: formatNumber(place), value: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildCountUnitQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const unit = randomOf(random, spec.units);
  const maxCount = Math.floor(spec.numberRange[1] / unit);
  const minCount = Math.max(2, Math.floor(spec.numberRange[0] / unit));
  const count = randomInt(random, minCount, Math.max(minCount + 1, maxCount));
  let n = composeFromUnits(count, unit);
  if (!spec.exactMultiplesOnly) {
    // A genuine remainder the student must reason past (floor, not round).
    n += randomInt(random, 0, unit - 1);
  }
  const correct = countOfUnit(n, unit);

  return {
    id: `pv-count-${n}-${unit}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'placeValue',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: formatNumber(n),
    promptKey: `decimalPlaceValue.promptFor.countUnit.${placeNameFor(unit)}`,
    explanationKey: 'decimalPlaceValue.explanation.countUnit',
    explanationParams: { number: formatNumber(n), unit: formatNumber(unit), count: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildComposeUnitQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const unit = randomOf(random, spec.units);
  const maxCount = Math.floor(spec.numberRange[1] / unit);
  const minCount = Math.max(2, Math.floor(spec.numberRange[0] / unit));
  const count = randomInt(random, minCount, Math.max(minCount + 1, maxCount));
  const correct = composeFromUnits(count, unit);

  return {
    id: `pv-compose-${count}-${unit}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'placeValue',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(count)} × ${formatNumber(unit)}`,
    promptKey: 'decimalPlaceValue.promptFor.composeUnit',
    explanationKey: 'decimalPlaceValue.explanation.composeUnit',
    explanationParams: { count: formatNumber(count), unit: formatNumber(unit), value: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildQuestion(difficultyId: string | null, random: RandomSource): PlaceValueQuestion {
  const difficulty = (difficultyId ?? 'basic') as PlaceValueDifficulty;
  const spec = DIFFICULTY_SPECS[difficulty] ?? DIFFICULTY_SPECS.basic;
  const template = randomOf(random, spec.templates);

  if (template === 'digitValue') return buildDigitValueQuestion(spec, difficulty, random);
  if (template === 'countUnit') return buildCountUnitQuestion(spec, difficulty, random);
  return buildComposeUnitQuestion(spec, difficulty, random);
}

export function buildPlaceValueQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<PlaceValueQuestion>[] {
  return Array.from({ length: count }, () => toTrainingQuestion(buildQuestion(difficultyId, random)));
}

export const decimalPlaceValueActivity: TrainingActivityDefinition<PlaceValueQuestion> = {
  id: DECIMAL_PLACE_VALUE_ID,
  i18nPrefix: 'decimalPlaceValue',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'decimalPlaceValue.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'decimalPlaceValue.difficulty.intermediate' },
      { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'decimalPlaceValue.difficulty.advanced' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: DECIMAL_PLACE_VALUE_RULES_VERSION,
  },
  generateQuestions: (input) => buildPlaceValueQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertPlaceValueQuestionIsSound(question: PlaceValueQuestion): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid place-value question (${question.id}): ${reason}`);
  };

  if (!question.validate(question.correctAnswerDisplay)) fail("the question's own correctAnswerDisplay does not validate");

  if (question.interaction.kind === 'multipleChoice') {
    const { options } = question.interaction;
    if (new Set(options).size !== options.length) fail('duplicate options');
    if (options.length !== 4) fail(`expected 4 options, got ${options.length}`);
    const correctCount = options.filter((option) => question.validate(option)).length;
    if (correctCount !== 1) fail(`expected exactly one correct option, found ${correctCount}`);
  }
}
