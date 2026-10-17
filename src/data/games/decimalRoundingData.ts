/**
 * Grade 4 Decimal Place Value — Skill 4: Rounding and Estimation
 * (עיגול ואומדן).
 *
 * `nearestBenchmark` and `rangeJudgment` deliberately use symbolic/numeric
 * multiple-choice options (the two benchmark numbers themselves, or `< N` /
 * `> N`) rather than word choices like "above"/"below" — those words would
 * need translating, and the generator has no access to `t()` (see
 * `decimalPlaceValueData.ts` for the same reasoning); numbers and symbols
 * render correctly in any language without it.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { numericMultipleChoice, toTrainingQuestion } from '../../utils/placeValueQuestion';
import { formatNumber, placeNameFor, roundingBenchmarks, roundTo, type PlaceValue } from '../../utils/placeValue';
import { shuffle } from '../../utils/shuffle';
import type { PlaceValueDifficulty, PlaceValueQuestion } from '../../types/placeValue';

export const DECIMAL_ROUNDING_ID = 'decimalRounding';
export const DECIMAL_ROUNDING_RULES_VERSION = 1;

type TemplateId = 'roundTo' | 'nearestBenchmark' | 'estimateSum' | 'rangeJudgment';

interface DifficultySpec {
  templates: TemplateId[];
  numberRange: [number, number];
  roundingPlaces: PlaceValue[];
  estimatePlace: PlaceValue;
}

const DIFFICULTY_SPECS: Record<PlaceValueDifficulty, DifficultySpec> = {
  basic: {
    templates: ['roundTo'],
    numberRange: [100, 9999],
    roundingPlaces: [10, 100],
    estimatePlace: 100,
  },
  intermediate: {
    templates: ['roundTo', 'nearestBenchmark'],
    numberRange: [1000, 99999],
    roundingPlaces: [100, 1000],
    estimatePlace: 1000,
  },
  advanced: {
    templates: ['roundTo', 'nearestBenchmark', 'estimateSum', 'rangeJudgment'],
    numberRange: [10000, 999999],
    roundingPlaces: [1000, 10000],
    estimatePlace: 10000,
  },
};

function buildRoundToQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const place = randomOf(random, spec.roundingPlaces);
  const n = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const correct = roundTo(n, place);
  const options = numericMultipleChoice(random, correct, place);

  return {
    id: `round-to-${n}-${place}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'rounding',
    difficulty,
    interaction: { kind: 'multipleChoice', options },
    display: formatNumber(n),
    promptKey: `decimalRounding.promptFor.roundTo.${placeNameFor(place)}`,
    explanationKey: 'decimalRounding.explanation.roundTo',
    explanationParams: { value: formatNumber(n), place: formatNumber(place), result: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildNearestBenchmarkQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const place = randomOf(random, spec.roundingPlaces);
  const n = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const { lower, upper } = roundingBenchmarks(n, place);
  const correct = roundTo(n, place);

  return {
    id: `round-benchmark-${n}-${place}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'rounding',
    difficulty,
    interaction: { kind: 'multipleChoice', options: shuffle([formatNumber(lower), formatNumber(upper)], random) },
    display: formatNumber(n),
    promptKey: `decimalRounding.promptFor.nearestBenchmark.${placeNameFor(place)}`,
    explanationKey: 'decimalRounding.explanation.nearestBenchmark',
    explanationParams: { value: formatNumber(n), lower: formatNumber(lower), upper: formatNumber(upper), result: formatNumber(correct) },
    correctAnswerDisplay: formatNumber(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => raw.replace(/,/g, '') === String(correct),
  };
}

function buildEstimateSumQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const place = spec.estimatePlace;
  const a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const b = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const correct = roundTo(a, place) + roundTo(b, place);

  return {
    id: `round-estimate-${a}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'rounding',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(a)} + ${formatNumber(b)}`,
    promptKey: `decimalRounding.promptFor.estimateSum.${placeNameFor(place)}`,
    explanationKey: 'decimalRounding.explanation.estimateSum',
    explanationParams: { a: formatNumber(roundTo(a, place)), b: formatNumber(roundTo(b, place)), result: formatNumber(correct) },
    correctAnswerDisplay: String(correct),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === correct,
  };
}

function buildRangeJudgmentQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const b = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const exact = a + b;
  // A threshold clearly off the exact sum, at a round place, so the
  // above/below judgement is never a coin flip.
  const roundPlace = spec.estimatePlace;
  let threshold = roundTo(exact, roundPlace);
  if (threshold === exact) threshold += roundPlace;
  const below = `< ${formatNumber(threshold)}`;
  const above = `> ${formatNumber(threshold)}`;
  const correctOption = exact < threshold ? below : above;

  return {
    id: `round-range-${a}-${b}-${threshold}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'rounding',
    difficulty,
    interaction: { kind: 'multipleChoice', options: shuffle([below, above], random) },
    display: `${formatNumber(a)} + ${formatNumber(b)}`,
    promptKey: 'decimalRounding.promptFor.rangeJudgment',
    explanationKey: 'decimalRounding.explanation.rangeJudgment',
    explanationParams: { a: formatNumber(a), b: formatNumber(b), exact: formatNumber(exact), threshold: formatNumber(threshold) },
    correctAnswerDisplay: correctOption,
    hasMultipleValidAnswers: false,
    validate: (raw) => raw === correctOption,
  };
}

function buildQuestion(difficultyId: string | null, random: RandomSource): PlaceValueQuestion {
  const difficulty = (difficultyId ?? 'basic') as PlaceValueDifficulty;
  const spec = DIFFICULTY_SPECS[difficulty] ?? DIFFICULTY_SPECS.basic;
  const template = randomOf(random, spec.templates);

  if (template === 'roundTo') return buildRoundToQuestion(spec, difficulty, random);
  if (template === 'nearestBenchmark') return buildNearestBenchmarkQuestion(spec, difficulty, random);
  if (template === 'estimateSum') return buildEstimateSumQuestion(spec, difficulty, random);
  return buildRangeJudgmentQuestion(spec, difficulty, random);
}

export function buildRoundingQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<PlaceValueQuestion>[] {
  return Array.from({ length: count }, () => toTrainingQuestion(buildQuestion(difficultyId, random)));
}

export const decimalRoundingActivity: TrainingActivityDefinition<PlaceValueQuestion> = {
  id: DECIMAL_ROUNDING_ID,
  i18nPrefix: 'decimalRounding',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'decimalRounding.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'decimalRounding.difficulty.intermediate' },
      { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'decimalRounding.difficulty.advanced' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: DECIMAL_ROUNDING_RULES_VERSION,
  },
  generateQuestions: (input) => buildRoundingQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertRoundingQuestionIsSound(question: PlaceValueQuestion): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid rounding question (${question.id}): ${reason}`);
  };

  if (!question.validate(question.correctAnswerDisplay)) fail("the question's own correctAnswerDisplay does not validate");

  if (question.interaction.kind === 'multipleChoice') {
    const { options } = question.interaction;
    if (new Set(options).size !== options.length) fail('duplicate options');
    if (options.length < 2) fail('fewer than two options');
    const correctCount = options.filter((option) => question.validate(option)).length;
    if (correctCount !== 1) fail(`expected exactly one correct option, found ${correctCount}`);
  }
}
