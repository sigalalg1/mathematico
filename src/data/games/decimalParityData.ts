/**
 * Grade 4 Decimal Place Value — Skill 6: Number Properties and Reasoning
 * Without Full Calculation (חושבים בלי לחשב).
 *
 * The flagship use of `constructChoice`: the student picks which two
 * numbers and which operation to combine, and any combination that
 * satisfies the condition is accepted — `validate` checks the mathematical
 * property itself, never a single stored "correct" combination, so there
 * is no "prewritten answer" to simply select.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { parseConstructAnswer, toTrainingQuestion } from '../../utils/placeValueQuestion';
import { formatNumber, isEven } from '../../utils/placeValue';
import { shuffle } from '../../utils/shuffle';
import type { PlaceValueDifficulty, PlaceValueQuestion } from '../../types/placeValue';

export const DECIMAL_PARITY_ID = 'decimalParity';
export const DECIMAL_PARITY_RULES_VERSION = 1;

type TemplateId = 'parity' | 'compareExpressions' | 'constructEven' | 'constructThreshold';

interface DifficultySpec {
  templates: TemplateId[];
  numberRange: [number, number];
}

const DIFFICULTY_SPECS: Record<PlaceValueDifficulty, DifficultySpec> = {
  basic: {
    templates: ['parity'],
    numberRange: [100, 9999],
  },
  intermediate: {
    templates: ['parity', 'compareExpressions'],
    numberRange: [1000, 99999],
  },
  advanced: {
    templates: ['parity', 'compareExpressions', 'constructEven', 'constructThreshold'],
    numberRange: [1000, 9999],
  },
};

function buildParityQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const a = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const b = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const isAdd = randomOf(random, [true, false]);
  const result = isAdd ? a + b : Math.max(a, b) - Math.min(a, b);
  const left = isAdd ? a : Math.max(a, b);
  const right = isAdd ? b : Math.min(a, b);
  const resultIsEven = isEven(result);

  return {
    id: `parity-${left}-${isAdd ? '+' : '-'}-${right}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'parity',
    difficulty,
    interaction: { kind: 'evenOddChoice' },
    display: `${formatNumber(left)} ${isAdd ? '+' : '−'} ${formatNumber(right)}`,
    promptKey: 'decimalParity.promptFor.parity',
    explanationKey: 'decimalParity.explanation.parity',
    explanationParams: { leftDigit: left % 10, rightDigit: right % 10, parity: resultIsEven ? 0 : 1 },
    correctAnswerDisplay: resultIsEven ? 'even' : 'odd',
    hasMultipleValidAnswers: false,
    validate: (raw) => raw === (resultIsEven ? 'even' : 'odd'),
  };
}

function buildCompareExpressionsQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const base = randomInt(random, spec.numberRange[0], spec.numberRange[1] - 20);
  // Two small, different adjustments to the same base — close enough that
  // reading the adjustment is faster and more reliable than computing both
  // totals, which is exactly the reasoning this question is after.
  const deltaLeft = randomInt(random, 1, 9);
  const deltaRight = randomInt(random, 1, 9);
  const leftValue = base + deltaLeft;
  const rightValue = base + (deltaLeft === deltaRight ? deltaRight + 1 : deltaRight);
  const symbol = leftValue < rightValue ? '<' : leftValue > rightValue ? '>' : '=';

  return {
    id: `parity-compare-${base}-${deltaLeft}-${deltaRight}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'parity',
    difficulty,
    interaction: {
      kind: 'compareSymbol',
      left: `${formatNumber(base)} + ${deltaLeft}`,
      right: `${formatNumber(base)} + ${rightValue - base}`,
    },
    display: '',
    promptKey: 'decimalParity.promptFor.compareExpressions',
    explanationKey: 'decimalParity.explanation.compareExpressions',
    explanationParams: { base: formatNumber(base), deltaLeft, deltaRight: rightValue - base, symbol },
    correctAnswerDisplay: symbol,
    hasMultipleValidAnswers: false,
    validate: (raw) => raw === symbol,
  };
}

/** A palette with a genuine mix of even and odd values, so both parities are always reachable. */
function buildMixedParityPalette(random: RandomSource): number[] {
  const evens: number[] = [];
  const odds: number[] = [];
  while (evens.length < 2 || odds.length < 2) {
    const n = randomInt(random, 1000, 9999);
    if (isEven(n) && evens.length < 3) evens.push(n);
    else if (!isEven(n) && odds.length < 2) odds.push(n);
  }
  return shuffle([...evens, ...odds], random);
}

function buildConstructEvenQuestion(difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const numbers = buildMixedParityPalette(random);
  // Two numbers of the same parity always sum to an even result — the
  // guaranteed, genuinely valid example shown in feedback.
  const evens = numbers.filter(isEven);
  const exampleA = evens[0];
  const exampleB = evens[1];

  return {
    id: `parity-construct-even-${numbers.join('-')}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'parity',
    difficulty,
    interaction: { kind: 'constructChoice', numbers, operations: ['+', '-'] },
    display: '',
    promptKey: 'decimalParity.promptFor.constructEven',
    explanationKey: 'decimalParity.explanation.constructEven',
    explanationParams: {},
    correctAnswerDisplay: `${exampleA}+${exampleB}`,
    hasMultipleValidAnswers: true,
    validate: (raw) => {
      const parsed = parseConstructAnswer(raw);
      if (!parsed) return false;
      if (!numbers.includes(parsed.a) || !numbers.includes(parsed.b) || parsed.a === parsed.b) return false;
      return isEven(parsed.result);
    },
  };
}

function buildConstructThresholdQuestion(difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  // A threshold chosen so subtracting the two closest palette values lands
  // under it — at least one solution is guaranteed to exist.
  const numbers = new Set<number>();
  while (numbers.size < 5) numbers.add(randomInt(random, 1000, 9999));
  const sorted = [...numbers].sort((a, b) => a - b);
  const smallestGap = sorted[1] - sorted[0];
  const threshold = smallestGap + randomInt(random, 50, 500);

  return {
    id: `parity-construct-threshold-${sorted.join('-')}-${threshold}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'parity',
    difficulty,
    interaction: { kind: 'constructChoice', numbers: shuffle(sorted, random), operations: ['-'] },
    display: '',
    promptKey: 'decimalParity.promptFor.constructThreshold',
    promptParams: { threshold: formatNumber(threshold) },
    explanationKey: 'decimalParity.explanation.constructThreshold',
    explanationParams: { threshold: formatNumber(threshold) },
    correctAnswerDisplay: `${sorted[1]}-${sorted[0]}`,
    hasMultipleValidAnswers: true,
    validate: (raw) => {
      const parsed = parseConstructAnswer(raw);
      if (!parsed) return false;
      if (!sorted.includes(parsed.a) || !sorted.includes(parsed.b) || parsed.a === parsed.b) return false;
      return parsed.result >= 0 && parsed.result < threshold;
    },
  };
}

function buildQuestion(difficultyId: string | null, random: RandomSource): PlaceValueQuestion {
  const difficulty = (difficultyId ?? 'basic') as PlaceValueDifficulty;
  const spec = DIFFICULTY_SPECS[difficulty] ?? DIFFICULTY_SPECS.basic;
  const template = randomOf(random, spec.templates);

  if (template === 'parity') return buildParityQuestion(spec, difficulty, random);
  if (template === 'compareExpressions') return buildCompareExpressionsQuestion(spec, difficulty, random);
  if (template === 'constructEven') return buildConstructEvenQuestion(difficulty, random);
  return buildConstructThresholdQuestion(difficulty, random);
}

export function buildParityQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<PlaceValueQuestion>[] {
  return Array.from({ length: count }, () => toTrainingQuestion(buildQuestion(difficultyId, random)));
}

export const decimalParityActivity: TrainingActivityDefinition<PlaceValueQuestion> = {
  id: DECIMAL_PARITY_ID,
  i18nPrefix: 'decimalParity',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'decimalParity.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'decimalParity.difficulty.intermediate' },
      { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'decimalParity.difficulty.advanced' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: DECIMAL_PARITY_RULES_VERSION,
  },
  generateQuestions: (input) => buildParityQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertParityQuestionIsSound(question: PlaceValueQuestion): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid parity question (${question.id}): ${reason}`);
  };

  if (question.interaction.kind === 'constructChoice') {
    // The "correctAnswerDisplay" for a multi-solution construct question is
    // only ever shown as one example, but it must still be a real one.
    if (!question.validate(question.correctAnswerDisplay)) fail('the shown example answer does not itself satisfy the condition');
    // At least one combination from the actual palette must be valid, or
    // the puzzle would be unsolvable.
    const { numbers, operations } = question.interaction;
    let solvable = false;
    for (const a of numbers) {
      for (const b of numbers) {
        if (a === b) continue;
        for (const op of operations) {
          if (question.validate(`${a}${op}${b}`)) solvable = true;
        }
      }
    }
    if (!solvable) fail('no combination of the offered numbers and operations satisfies the condition');
    return;
  }

  if (!question.validate(question.correctAnswerDisplay)) fail("the question's own correctAnswerDisplay does not validate");

  if (question.interaction.kind === 'evenOddChoice') {
    if (question.correctAnswerDisplay !== 'even' && question.correctAnswerDisplay !== 'odd') fail('correctAnswerDisplay must be "even" or "odd"');
    if (question.validate('even') === question.validate('odd')) fail('exactly one of even/odd must validate, never both or neither');
  }

  if (question.interaction.kind === 'compareSymbol') {
    for (const symbol of ['<', '=', '>']) {
      const shouldBeValid = symbol === question.correctAnswerDisplay;
      if (question.validate(symbol) !== shouldBeValid) fail(`validate(${symbol}) disagrees with correctAnswerDisplay`);
    }
  }
}
