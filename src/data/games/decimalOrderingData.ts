/**
 * Grade 4 Decimal Place Value — Skill 3: Ordering, Comparing and Number
 * Sequences (השוואה, סדר וסדרות).
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { toTrainingQuestion } from '../../utils/placeValueQuestion';
import { formatNumber } from '../../utils/placeValue';
import { shuffle } from '../../utils/shuffle';
import type { PlaceValueDifficulty, PlaceValueQuestion } from '../../types/placeValue';

export const DECIMAL_ORDERING_ID = 'decimalOrdering';
export const DECIMAL_ORDERING_RULES_VERSION = 1;

type TemplateId = 'compare' | 'sequenceNext' | 'numberBetween' | 'orderFour';

interface DifficultySpec {
  templates: TemplateId[];
  numberRange: [number, number];
  steps: number[];
  /** How close the two compared numbers' magnitudes are allowed to be (smaller = trickier). */
  compareCloseness: 'far' | 'close';
}

const DIFFICULTY_SPECS: Record<PlaceValueDifficulty, DifficultySpec> = {
  basic: {
    templates: ['compare', 'sequenceNext'],
    numberRange: [100, 9999],
    steps: [10, 100],
    compareCloseness: 'far',
  },
  intermediate: {
    templates: ['compare', 'sequenceNext', 'orderFour'],
    numberRange: [10000, 99999],
    steps: [100, 1000, 10000],
    compareCloseness: 'close',
  },
  advanced: {
    templates: ['compare', 'sequenceNext', 'numberBetween', 'orderFour'],
    numberRange: [10000, 999999],
    steps: [1000, 10000],
    compareCloseness: 'close',
  },
};

function buildCompareQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  let b: number;
  if (spec.compareCloseness === 'close') {
    // Same leading digit(s), differing somewhere in the middle — the classic
    // "70,090 vs 70,900" trap, never resolvable just by counting digits.
    const magnitude = 10 ** Math.max(2, String(a).length - 2);
    b = a - (a % magnitude) + randomInt(random, 0, magnitude - 1);
    if (b === a) b += randomOf(random, [-1, 1]) * randomInt(random, 1, magnitude - 1);
  } else {
    b = a + randomOf(random, [-1, 1]) * randomInt(random, 1, Math.max(10, Math.floor(a / 3)));
  }
  b = Math.max(0, b);
  const symbol = a < b ? '<' : a > b ? '>' : '=';

  return {
    id: `ord-compare-${a}-${b}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'ordering',
    difficulty,
    interaction: { kind: 'compareSymbol', left: formatNumber(a), right: formatNumber(b) },
    display: '',
    promptKey: 'decimalOrdering.promptFor.compare',
    explanationKey: 'decimalOrdering.explanation.compare',
    explanationParams: { left: formatNumber(a), right: formatNumber(b), symbol },
    correctAnswerDisplay: symbol,
    hasMultipleValidAnswers: false,
    validate: (raw) => raw === symbol,
  };
}

function buildSequenceNextQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const step = randomOf(random, spec.steps);
  const termCount = 3;
  const start = randomInt(random, 0, Math.max(0, spec.numberRange[1] - step * (termCount + 1)));
  const terms = Array.from({ length: termCount }, (_, i) => start + step * i);
  const next = start + step * termCount;

  return {
    id: `ord-seq-${start}-${step}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'ordering',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${terms.map(formatNumber).join(' → ')} → ?`,
    promptKey: 'decimalOrdering.promptFor.sequenceNext',
    explanationKey: 'decimalOrdering.explanation.sequenceNext',
    explanationParams: { step: formatNumber(step), value: formatNumber(next) },
    correctAnswerDisplay: String(next),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === next,
  };
}

function buildNumberBetweenQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  // A narrow but non-empty open interval — several valid answers exist, but
  // not so many that "anything goes" (forces real boundary reasoning).
  const width = randomInt(random, 10, 30);
  const lower = randomInt(random, spec.numberRange[0], spec.numberRange[1] - width);
  const upper = lower + width;

  return {
    id: `ord-between-${lower}-${upper}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'ordering',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(lower)} < n < ${formatNumber(upper)}`,
    promptKey: 'decimalOrdering.promptFor.numberBetween',
    explanationKey: 'decimalOrdering.explanation.numberBetween',
    explanationParams: { lower: formatNumber(lower), upper: formatNumber(upper) },
    correctAnswerDisplay: String(lower + 1),
    hasMultipleValidAnswers: true,
    validate: (raw) => {
      const n = Number(raw);
      return Number.isInteger(n) && n > lower && n < upper;
    },
  };
}

function buildOrderFourQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const values = new Set<number>();
  while (values.size < 4) {
    values.add(randomInt(random, spec.numberRange[0], spec.numberRange[1]));
  }
  const numbers = [...values];
  const sorted = [...numbers].sort((a, b) => a - b);
  const correctText = sorted.map(formatNumber).join(', ');

  const orderings = new Set<string>([correctText]);
  let guard = 0;
  while (orderings.size < 4 && guard < 200) {
    guard += 1;
    const shuffled = shuffle(numbers, random);
    orderings.add(shuffled.map(formatNumber).join(', '));
  }

  return {
    id: `ord-order-${numbers.join('-')}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'ordering',
    difficulty,
    interaction: { kind: 'multipleChoice', options: shuffle([...orderings], random) },
    display: numbers.map(formatNumber).join(', '),
    promptKey: 'decimalOrdering.promptFor.orderFour',
    explanationKey: 'decimalOrdering.explanation.orderFour',
    explanationParams: { sorted: correctText },
    correctAnswerDisplay: correctText,
    hasMultipleValidAnswers: false,
    validate: (raw) => raw === correctText,
  };
}

function buildQuestion(difficultyId: string | null, random: RandomSource): PlaceValueQuestion {
  const difficulty = (difficultyId ?? 'basic') as PlaceValueDifficulty;
  const spec = DIFFICULTY_SPECS[difficulty] ?? DIFFICULTY_SPECS.basic;
  const template = randomOf(random, spec.templates);

  if (template === 'compare') return buildCompareQuestion(spec, difficulty, random);
  if (template === 'sequenceNext') return buildSequenceNextQuestion(spec, difficulty, random);
  if (template === 'numberBetween') return buildNumberBetweenQuestion(spec, difficulty, random);
  return buildOrderFourQuestion(spec, difficulty, random);
}

export function buildOrderingQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<PlaceValueQuestion>[] {
  return Array.from({ length: count }, () => toTrainingQuestion(buildQuestion(difficultyId, random)));
}

export const decimalOrderingActivity: TrainingActivityDefinition<PlaceValueQuestion> = {
  id: DECIMAL_ORDERING_ID,
  i18nPrefix: 'decimalOrdering',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'decimalOrdering.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'decimalOrdering.difficulty.intermediate' },
      { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'decimalOrdering.difficulty.advanced' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: DECIMAL_ORDERING_RULES_VERSION,
  },
  generateQuestions: (input) => buildOrderingQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertOrderingQuestionIsSound(question: PlaceValueQuestion): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid ordering question (${question.id}): ${reason}`);
  };

  if (!question.validate(question.correctAnswerDisplay)) fail("the question's own correctAnswerDisplay does not validate");

  if (question.interaction.kind === 'compareSymbol') {
    const left = Number(question.interaction.left.replace(/,/g, ''));
    const right = Number(question.interaction.right.replace(/,/g, ''));
    const expected = left < right ? '<' : left > right ? '>' : '=';
    if (question.correctAnswerDisplay !== expected) fail(`compare symbol ${question.correctAnswerDisplay} disagrees with the actual numbers`);
    for (const symbol of ['<', '=', '>']) {
      const shouldBeValid = symbol === expected;
      if (question.validate(symbol) !== shouldBeValid) fail(`validate(${symbol}) disagrees with the actual comparison`);
    }
  }

  if (question.interaction.kind === 'multipleChoice') {
    const { options } = question.interaction;
    if (new Set(options).size !== options.length) fail('duplicate options');
    if (options.length !== 4) fail(`expected 4 options, got ${options.length}`);
    const correctCount = options.filter((option) => question.validate(option)).length;
    if (correctCount !== 1) fail(`expected exactly one correct option, found ${correctCount}`);
  }
}
