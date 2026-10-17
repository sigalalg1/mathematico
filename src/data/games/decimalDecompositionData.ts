/**
 * Grade 4 Decimal Place Value — Skill 2: Number Construction and
 * Decomposition (פירוק והרכבת מספרים).
 *
 * Covers standard expanded notation, a missing term within it, and
 * nonstandard decomposition (e.g. "23 hundreds + 4 tens"). Nonstandard
 * quantities are shown as `count × place` (e.g. "23 × 100") rather than a
 * translated word ("23 hundreds") — this keeps the arithmetic itself
 * unambiguous and sidesteps needing a translated unit word at generation
 * time (the generator has no access to `t()`; see `decimalPlaceValueData.ts`
 * for the same reasoning), while testing the identical skill: converting a
 * non-base-10-digit quantity of a unit into a number.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { toTrainingQuestion } from '../../utils/placeValueQuestion';
import { decomposeStandard, formatNumber, type PlaceValue, type PlaceValueTerm } from '../../utils/placeValue';
import { shuffle } from '../../utils/shuffle';
import type { PlaceValueDifficulty, PlaceValueQuestion } from '../../types/placeValue';

export const DECIMAL_DECOMPOSITION_ID = 'decimalDecomposition';
export const DECIMAL_DECOMPOSITION_RULES_VERSION = 1;

type TemplateId = 'expandedSum' | 'missingTerm' | 'nonstandardCompose' | 'recognizeDecomposition';

interface DifficultySpec {
  templates: TemplateId[];
  numberRange: [number, number];
  nonstandardUnits: [PlaceValue, PlaceValue][];
}

const DIFFICULTY_SPECS: Record<PlaceValueDifficulty, DifficultySpec> = {
  basic: {
    templates: ['expandedSum'],
    numberRange: [1000, 9999],
    nonstandardUnits: [[100, 10]],
  },
  intermediate: {
    templates: ['expandedSum', 'missingTerm', 'nonstandardCompose'],
    numberRange: [10000, 99999],
    nonstandardUnits: [
      [100, 10],
      [1000, 100],
    ],
  },
  advanced: {
    templates: ['missingTerm', 'nonstandardCompose', 'recognizeDecomposition'],
    numberRange: [100000, 999999],
    nonstandardUnits: [
      [1000, 10],
      [10000, 100],
      [1000, 100],
    ],
  },
};

/** A number whose expanded form has at least `minTerms` nonzero terms. */
function randomNumberWithTerms(random: RandomSource, range: [number, number], minTerms: number): { n: number; terms: PlaceValueTerm[] } {
  let n = randomInt(random, range[0], range[1]);
  let terms = decomposeStandard(n);
  let guard = 0;
  while (terms.length < minTerms && guard < 300) {
    guard += 1;
    n = randomInt(random, range[0], range[1]);
    terms = decomposeStandard(n);
  }
  return { n, terms };
}

function buildExpandedSumQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const { n, terms } = randomNumberWithTerms(random, spec.numberRange, 2);
  const display = terms.map((term) => formatNumber(term.value)).join(' + ');

  return {
    id: `dec-sum-${n}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'decomposition',
    difficulty,
    interaction: { kind: 'numericInput' },
    display,
    promptKey: 'decimalDecomposition.promptFor.expandedSum',
    explanationKey: 'decimalDecomposition.explanation.expandedSum',
    explanationParams: { terms: display, value: formatNumber(n) },
    correctAnswerDisplay: String(n),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === n,
  };
}

function buildMissingTermQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const { n, terms } = randomNumberWithTerms(random, spec.numberRange, 3);
  const hiddenIndex = randomInt(random, 0, terms.length - 1);
  const hidden = terms[hiddenIndex];
  const display = terms.map((term, index) => (index === hiddenIndex ? '___' : formatNumber(term.value))).join(' + ');

  return {
    id: `dec-missing-${n}-${hidden.place}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'decomposition',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${formatNumber(n)} = ${display}`,
    promptKey: 'decimalDecomposition.promptFor.missingTerm',
    explanationKey: 'decimalDecomposition.explanation.missingTerm',
    explanationParams: { value: formatNumber(n), missing: formatNumber(hidden.value) },
    correctAnswerDisplay: String(hidden.value),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === hidden.value,
  };
}

function buildNonstandardComposeQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const [bigUnit, smallUnit] = randomOf(random, spec.nonstandardUnits);
  const bigCount = randomInt(random, 10, 99);
  const smallCount = randomInt(random, 1, 9);
  const sum = bigCount * bigUnit + smallCount * smallUnit;

  return {
    id: `dec-nonstd-${bigCount}-${bigUnit}-${smallCount}-${smallUnit}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'decomposition',
    difficulty,
    interaction: { kind: 'numericInput' },
    display: `${bigCount} × ${formatNumber(bigUnit)} + ${smallCount} × ${formatNumber(smallUnit)}`,
    promptKey: 'decimalDecomposition.promptFor.nonstandardCompose',
    explanationKey: 'decimalDecomposition.explanation.nonstandardCompose',
    explanationParams: { a: formatNumber(bigCount * bigUnit), b: formatNumber(smallCount * smallUnit), value: formatNumber(sum) },
    correctAnswerDisplay: String(sum),
    hasMultipleValidAnswers: false,
    validate: (raw) => Number(raw) === sum,
  };
}

function buildRecognizeDecompositionQuestion(spec: DifficultySpec, difficulty: PlaceValueDifficulty, random: RandomSource): PlaceValueQuestion {
  const { n, terms } = randomNumberWithTerms(random, spec.numberRange, 3);
  const correctText = terms.map((term) => formatNumber(term.value)).join(' + ');

  const distractors = new Set<string>();
  let guard = 0;
  while (distractors.size < 3 && guard < 200) {
    guard += 1;
    // Perturb one term's value (a plausible slip: one digit shifted by a place).
    const i = randomInt(random, 0, terms.length - 1);
    const perturbed = terms.map((term, index) =>
      index === i ? { ...term, value: term.value + randomOf(random, [-term.place, term.place, term.place * 9]) } : term,
    );
    if (perturbed.some((term) => term.value <= 0)) continue;
    const text = perturbed.map((term) => formatNumber(term.value)).join(' + ');
    if (text !== correctText) distractors.add(text);
  }

  const options = shuffle([correctText, ...distractors], random);

  return {
    id: `dec-recognize-${n}-${Math.floor(random() * 1_000_000)}`,
    skillId: 'decomposition',
    difficulty,
    interaction: { kind: 'multipleChoice', options },
    display: formatNumber(n),
    promptKey: 'decimalDecomposition.promptFor.recognizeDecomposition',
    explanationKey: 'decimalDecomposition.explanation.recognizeDecomposition',
    explanationParams: { value: formatNumber(n), terms: correctText },
    correctAnswerDisplay: correctText,
    hasMultipleValidAnswers: false,
    validate: (raw) => raw === correctText,
  };
}

function buildQuestion(difficultyId: string | null, random: RandomSource): PlaceValueQuestion {
  const difficulty = (difficultyId ?? 'basic') as PlaceValueDifficulty;
  const spec = DIFFICULTY_SPECS[difficulty] ?? DIFFICULTY_SPECS.basic;
  const template = randomOf(random, spec.templates);

  if (template === 'expandedSum') return buildExpandedSumQuestion(spec, difficulty, random);
  if (template === 'missingTerm') return buildMissingTermQuestion(spec, difficulty, random);
  if (template === 'nonstandardCompose') return buildNonstandardComposeQuestion(spec, difficulty, random);
  return buildRecognizeDecompositionQuestion(spec, difficulty, random);
}

export function buildDecompositionQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<PlaceValueQuestion>[] {
  return Array.from({ length: count }, () => toTrainingQuestion(buildQuestion(difficultyId, random)));
}

export const decimalDecompositionActivity: TrainingActivityDefinition<PlaceValueQuestion> = {
  id: DECIMAL_DECOMPOSITION_ID,
  i18nPrefix: 'decimalDecomposition',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'decimalDecomposition.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'decimalDecomposition.difficulty.intermediate' },
      { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'decimalDecomposition.difficulty.advanced' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: DECIMAL_DECOMPOSITION_RULES_VERSION,
  },
  generateQuestions: (input) => buildDecompositionQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertDecompositionQuestionIsSound(question: PlaceValueQuestion): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid decomposition question (${question.id}): ${reason}`);
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
