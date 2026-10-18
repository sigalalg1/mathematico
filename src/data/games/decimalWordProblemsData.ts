/**
 * Grade 4 Decimal Place Value — Skill 8: Word Problems and Integrated
 * Reasoning (בעיות מילוליות וחשיבה משולבת).
 *
 * Each template is one fixed narrative (its words live in i18n, not in the
 * generator, same reasoning as every other skill in this unit — see
 * `decimalPlaceValueData.ts`), with only the numbers varying. `display` is
 * always empty; the story itself (via `promptKey`/`promptParams`) carries
 * the question, so there is no separate bare-math hero line competing with
 * the sentence. `multiStepScenario` and `digitValueScenario` are the
 * advanced-only reasoning templates: a genuine two-operation problem and a
 * place-value question embedded in a real quantity, respectively — this is
 * where this skill ties several other skills together rather than just
 * dressing up a single calculation in a sentence.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { toTrainingQuestion } from '../../utils/placeValueQuestion';
import { formatNumber, placeNameFor, valueAt, type PlaceValue } from '../../utils/placeValue';
import type { PlaceValueDifficulty, PlaceValueQuestion } from '../../types/placeValue';

export const DECIMAL_WORD_PROBLEMS_ID = 'decimalWordProblems';
export const DECIMAL_WORD_PROBLEMS_RULES_VERSION = 1;

type TemplateId = 'sumScenario' | 'differenceScenario' | 'compareScenario' | 'roundEstimateScenario' | 'missingAddendScenario' | 'multiStepScenario' | 'digitValueScenario';

interface DifficultySpec {
  templates: TemplateId[];
  numberRange: [number, number];
  roundPlaces: PlaceValue[];
  digitPlaces: PlaceValue[];
}

const DIFFICULTY_SPECS: Record<PlaceValueDifficulty, DifficultySpec> = {
  basic: {
    templates: ['sumScenario', 'differenceScenario'],
    numberRange: [300, 9999],
    roundPlaces: [100],
    digitPlaces: [100],
  },
  intermediate: {
    templates: ['sumScenario', 'differenceScenario', 'compareScenario', 'roundEstimateScenario', 'missingAddendScenario'],
    numberRange: [1000, 99999],
    roundPlaces: [100, 1000],
    digitPlaces: [100, 1000],
  },
  advanced: {
    templates: ['compareScenario', 'roundEstimateScenario', 'missingAddendScenario', 'multiStepScenario', 'digitValueScenario'],
    numberRange: [10000, 999999],
    roundPlaces: [1000, 10000],
    digitPlaces: [100, 1000, 10000],
  },
};

function buildSumScenarioQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const b = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const total = a + b;

  return {
    id: `word-sum-${a}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'wordProblems',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: '',
    promptKey: 'decimalWordProblems.promptFor.sumScenario',
    promptParams: { a: formatNumber(a), b: formatNumber(b) },
    explanationKey: 'decimalWordProblems.explanation.sumScenario',
    explanationParams: { a: formatNumber(a), b: formatNumber(b), result: formatNumber(total) },
    correctAnswerDisplay: String(total),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === total,
  };
}

function buildDifferenceScenarioQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const a = randomInt(random, Math.max(spec.numberRange[0], 200), spec.numberRange[1]);
  const b = randomInt(random, 100, a - 100);
  const remaining = a - b;

  return {
    id: `word-diff-${a}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'wordProblems',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: '',
    promptKey: 'decimalWordProblems.promptFor.differenceScenario',
    promptParams: { a: formatNumber(a), b: formatNumber(b) },
    explanationKey: 'decimalWordProblems.explanation.differenceScenario',
    explanationParams: { a: formatNumber(a), b: formatNumber(b), result: formatNumber(remaining) },
    correctAnswerDisplay: String(remaining),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === remaining,
  };
}

function buildCompareScenarioQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  let b = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  while (b === a) b = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const symbol = a < b ? '<' : '>';

  return {
    id: `word-compare-${a}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'wordProblems',
    difficulty,
    interaction: { kind: 'compareSymbol', left: formatNumber(a), right: formatNumber(b) },
    display: '',
    promptKey: 'decimalWordProblems.promptFor.compareScenario',
    explanationKey: 'decimalWordProblems.explanation.compareScenario',
    explanationParams: { a: formatNumber(a), b: formatNumber(b) },
    correctAnswerDisplay: symbol,
    hasMultipleValidAnswers: false,
    validate: (raw) => raw === symbol,
  };
}

function buildRoundEstimateScenarioQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const place = randomOf(random, spec.roundPlaces);
  const n = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const remainder = n % place;
  const rounded = remainder * 2 >= place ? n - remainder + place : n - remainder;

  return {
    id: `word-round-${n}-${place}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'wordProblems',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: '',
    promptKey: `decimalWordProblems.promptFor.roundEstimateScenario.${placeNameFor(place)}`,
    promptParams: { value: formatNumber(n) },
    explanationKey: 'decimalWordProblems.explanation.roundEstimateScenario',
    explanationParams: { value: formatNumber(n), result: formatNumber(rounded) },
    correctAnswerDisplay: String(rounded),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === rounded,
  };
}

function buildMissingAddendScenarioQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const before = randomInt(random, spec.numberRange[0], spec.numberRange[1] - 100);
  const after = randomInt(random, before + 100, spec.numberRange[1]);
  const arrived = after - before;

  return {
    id: `word-missing-addend-${before}-${after}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'wordProblems',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: '',
    promptKey: 'decimalWordProblems.promptFor.missingAddendScenario',
    promptParams: { before: formatNumber(before), after: formatNumber(after) },
    explanationKey: 'decimalWordProblems.explanation.missingAddendScenario',
    explanationParams: { before: formatNumber(before), after: formatNumber(after), result: formatNumber(arrived) },
    correctAnswerDisplay: String(arrived),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === arrived,
  };
}

function buildMultiStepScenarioQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const firstWeek = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const secondWeek = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const total = firstWeek + secondWeek;
  const used = randomInt(random, 100, total - 100);
  const remaining = total - used;

  return {
    id: `word-multistep-${firstWeek}-${secondWeek}-${used}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'wordProblems',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: '',
    promptKey: 'decimalWordProblems.promptFor.multiStepScenario',
    promptParams: { firstWeek: formatNumber(firstWeek), secondWeek: formatNumber(secondWeek), used: formatNumber(used) },
    explanationKey: 'decimalWordProblems.explanation.multiStepScenario',
    explanationParams: { total: formatNumber(total), used: formatNumber(used), result: formatNumber(remaining) },
    correctAnswerDisplay: String(remaining),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === remaining,
  };
}

function buildDigitValueScenarioQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const place = randomOf(random, spec.digitPlaces);
  const n = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const value = valueAt(n, place);

  return {
    id: `word-digit-value-${n}-${place}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'wordProblems',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: '',
    promptKey: `decimalWordProblems.promptFor.digitValueScenario.${placeNameFor(place)}`,
    promptParams: { value: formatNumber(n) },
    explanationKey: 'decimalWordProblems.explanation.digitValueScenario',
    explanationParams: { value: formatNumber(n), result: formatNumber(value) },
    correctAnswerDisplay: String(value),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === value,
  };
}

function buildQuestion(difficultyId: string | null, random: RandomSource): PlaceValueQuestion {
  const difficulty = (difficultyId ?? 'basic') as PlaceValueDifficulty;
  const spec = DIFFICULTY_SPECS[difficulty] ?? DIFFICULTY_SPECS.basic;
  const template = randomOf(random, spec.templates);

  if (template === 'sumScenario') return buildSumScenarioQuestion(spec, difficulty, random);
  if (template === 'differenceScenario') return buildDifferenceScenarioQuestion(spec, difficulty, random);
  if (template === 'compareScenario') return buildCompareScenarioQuestion(spec, difficulty, random);
  if (template === 'roundEstimateScenario') return buildRoundEstimateScenarioQuestion(spec, difficulty, random);
  if (template === 'missingAddendScenario') return buildMissingAddendScenarioQuestion(spec, difficulty, random);
  if (template === 'multiStepScenario') return buildMultiStepScenarioQuestion(spec, difficulty, random);
  return buildDigitValueScenarioQuestion(spec, difficulty, random);
}

export function buildWordProblemsQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<PlaceValueQuestion>[] {
  return Array.from({ length: count }, () => toTrainingQuestion(buildQuestion(difficultyId, random)));
}

export const decimalWordProblemsActivity: TrainingActivityDefinition<PlaceValueQuestion> = {
  id: DECIMAL_WORD_PROBLEMS_ID,
  i18nPrefix: 'decimalWordProblems',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'decimalWordProblems.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'decimalWordProblems.difficulty.intermediate' },
      { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'decimalWordProblems.difficulty.advanced' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: DECIMAL_WORD_PROBLEMS_RULES_VERSION,
  },
  generateQuestions: (input) => buildWordProblemsQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertWordProblemsQuestionIsSound(question: PlaceValueQuestion): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid word problem question (${question.id}): ${reason}`);
  };

  if (!question.validate(question.correctAnswerDisplay)) fail("the question's own correctAnswerDisplay does not validate");

  if (question.interaction.kind === 'numericInput') {
    const n = Number(question.correctAnswerDisplay);
    if (!Number.isInteger(n) || n < 0) fail('correctAnswerDisplay must be a nonnegative integer');
  }

  if (question.interaction.kind === 'compareSymbol') {
    for (const symbol of ['<', '=', '>']) {
      const shouldBeValid = symbol === question.correctAnswerDisplay;
      if (question.validate(symbol) !== shouldBeValid) fail(`validate(${symbol}) disagrees with correctAnswerDisplay`);
    }
  }
}
