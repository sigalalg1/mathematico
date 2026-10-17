/**
 * Grade 4 Decimal Place Value — Skill 7: Missing Numbers, Constraints and
 * Multiple Solutions (מספרים חסרים וחידות מספרים).
 *
 * `rangeAndDigit` and `targetSum` are deliberately multi-solution: any
 * number (or any pair from the palette) that satisfies the stated
 * condition is accepted — `validate` checks the condition directly, never
 * a single stored answer.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { parseConstructAnswer, toTrainingQuestion } from '../../utils/placeValueQuestion';
import { digitAt, formatNumber } from '../../utils/placeValue';
import { shuffle } from '../../utils/shuffle';
import type { PlaceValueDifficulty, PlaceValueQuestion } from '../../types/placeValue';

export const DECIMAL_CONSTRAINTS_ID = 'decimalConstraints';
export const DECIMAL_CONSTRAINTS_RULES_VERSION = 1;

type TemplateId = 'missingDigit' | 'rangeAndDigit' | 'targetSum';

interface DifficultySpec {
  templates: TemplateId[];
  numberRange: [number, number];
  rangeWidth: [number, number];
}

const DIFFICULTY_SPECS: Record<PlaceValueDifficulty, DifficultySpec> = {
  basic: {
    templates: ['missingDigit'],
    numberRange: [1000, 9999],
    rangeWidth: [500, 1000],
  },
  intermediate: {
    templates: ['missingDigit', 'rangeAndDigit'],
    numberRange: [10000, 99999],
    rangeWidth: [500, 1000],
  },
  advanced: {
    templates: ['missingDigit', 'rangeAndDigit', 'targetSum'],
    numberRange: [10000, 99999],
    rangeWidth: [100, 300],
  },
};

function buildMissingDigitQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const addend = randomInt(random, spec.numberRange[0], spec.numberRange[1]);
  const other = randomInt(random, 100, 9999);
  const total = addend + other;
  const place = randomOf(random, [1, 10, 100, 1000] as const);
  const hiddenDigit = digitAt(addend, place);
  // Build the masked display directly from the digit string, by position
  // from the end — so there is no ambiguity about which occurrence of the
  // digit was hidden, even if it repeats elsewhere in the number.
  const addendDigits = String(addend).split('');
  const positionFromEnd = Math.log10(place);
  const maskedDigits = addendDigits.map((d, i) => (addendDigits.length - 1 - i === positionFromEnd ? '_' : d));
  const masked = formatMaskedNumber(maskedDigits);

  return {
    id: `constraint-digit-${addend}-${place}-${other}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'constraints',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${masked} + ${formatNumber(other)} = ${formatNumber(total)}`,
    promptKey: 'decimalConstraints.promptFor.missingDigit',
    explanationKey: 'decimalConstraints.explanation.missingDigit',
    explanationParams: { digit: hiddenDigit, addend: formatNumber(addend) },
    correctAnswerDisplay: String(hiddenDigit),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === hiddenDigit,
  };
}

/** Re-inserts comma grouping into a digit array that may contain one `'_'`. */
function formatMaskedNumber(digits: string[]): string {
  const grouped: string[] = [];
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i;
    if (i > 0 && fromEnd % 3 === 0) grouped.push(',');
    grouped.push(digits[i]);
  }
  return grouped.join('');
}

function buildRangeAndDigitQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const width = randomInt(random, spec.rangeWidth[0], spec.rangeWidth[1]);
  const lower = randomInt(random, spec.numberRange[0], spec.numberRange[1] - width);
  const upper = lower + width;
  // Pick a real number strictly inside the interval FIRST, then read its
  // hundreds digit off — rather than picking a digit at random and hoping a
  // number with that digit happens to fall in the interval. A narrow
  // interval only ever contains one or two possible hundreds digits, so
  // picking the digit independently could describe an unsatisfiable
  // constraint; this way a solution exists by construction, always.
  const example = randomInt(random, lower + 1, upper - 1);
  const requiredHundredsDigit = digitAt(example, 100);

  return {
    id: `constraint-range-${lower}-${upper}-${requiredHundredsDigit}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'constraints',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(lower)} < n < ${formatNumber(upper)}`,
    promptKey: 'decimalConstraints.promptFor.rangeAndDigit',
    promptParams: { digit: requiredHundredsDigit },
    explanationKey: 'decimalConstraints.explanation.rangeAndDigit',
    explanationParams: { lower: formatNumber(lower), upper: formatNumber(upper), digit: requiredHundredsDigit },
    correctAnswerDisplay: String(example),
    hasMultipleValidAnswers: true,
    validate: (raw) => {
      const n = Number(raw);
      return Number.isInteger(n) && n > lower && n < upper && digitAt(n, 100) === requiredHundredsDigit;
    },
  };
}

function buildTargetSumQuestion(difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  // Two numbers already guaranteed to sum to the target, plus three other
  // distractor values, so the palette always has at least one real solution.
  const a = randomInt(random, 10000, 90000);
  const target = a + randomInt(random, 10000, 90000);
  const b = target - a;
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const candidate = randomInt(random, 10000, 99999);
    if (candidate !== a && candidate !== b && candidate + a !== target && candidate + b !== target) distractors.add(candidate);
  }
  const numbers = shuffle([a, b, ...distractors], random);

  return {
    id: `constraint-sum-${a}-${b}-${target}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'constraints',
    difficulty,
    interaction: { kind: 'constructChoice', numbers, operations: ['+'] },
    display: '',
    promptKey: 'decimalConstraints.promptFor.targetSum',
    promptParams: { target: formatNumber(target) },
    explanationKey: 'decimalConstraints.explanation.targetSum',
    explanationParams: { a: formatNumber(a), b: formatNumber(b), target: formatNumber(target) },
    correctAnswerDisplay: `${a}+${b}`,
    hasMultipleValidAnswers: true,
    validate: (raw) => {
      const parsed = parseConstructAnswer(raw);
      if (!parsed) return false;
      if (!numbers.includes(parsed.a) || !numbers.includes(parsed.b) || parsed.a === parsed.b) return false;
      return parsed.result === target;
    },
  };
}

function buildQuestion(difficultyId: string | null, random: RandomSource): PlaceValueQuestion {
  const difficulty = (difficultyId ?? 'basic') as PlaceValueDifficulty;
  const spec = DIFFICULTY_SPECS[difficulty] ?? DIFFICULTY_SPECS.basic;
  const template = randomOf(random, spec.templates);

  if (template === 'missingDigit') return buildMissingDigitQuestion(spec, difficulty, random);
  if (template === 'rangeAndDigit') return buildRangeAndDigitQuestion(spec, difficulty, random);
  return buildTargetSumQuestion(difficulty, random);
}

export function buildConstraintsQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<PlaceValueQuestion>[] {
  return Array.from({ length: count }, () => toTrainingQuestion(buildQuestion(difficultyId, random)));
}

export const decimalConstraintsActivity: TrainingActivityDefinition<PlaceValueQuestion> = {
  id: DECIMAL_CONSTRAINTS_ID,
  i18nPrefix: 'decimalConstraints',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'decimalConstraints.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'decimalConstraints.difficulty.intermediate' },
      { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'decimalConstraints.difficulty.advanced' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: DECIMAL_CONSTRAINTS_RULES_VERSION,
  },
  generateQuestions: (input) => buildConstraintsQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertConstraintsQuestionIsSound(question: PlaceValueQuestion): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid constraints question (${question.id}): ${reason}`);
  };

  if (!question.correctAnswerDisplay) fail('missing a concrete example answer');
  if (!question.validate(question.correctAnswerDisplay)) fail("the question's own correctAnswerDisplay does not validate");

  if (question.interaction.kind === 'numericInput' && question.display.includes('< n <')) {
    const [lowerText, upperText] = question.display.split(' < n < ');
    const lower = Number(lowerText.replace(/,/g, ''));
    const upper = Number(upperText.replace(/,/g, ''));
    if (question.validate(String(lower))) fail('the lower boundary itself validates — the interval must be strictly open');
    if (question.validate(String(upper))) fail('the upper boundary itself validates — the interval must be strictly open');
  }

  if (question.interaction.kind === 'constructChoice') {
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
  }
}
