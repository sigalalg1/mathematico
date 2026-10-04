/**
 * Grade 7 Algebra — Activity 5: Combining Like Terms (איברים דומים).
 *
 * The formal skill the previous activity's discovery work was building
 * toward: x-terms combine with x-terms, numbers combine with numbers, and
 * `3x + 4` can never become `7x` — an x-term and a plain number are not the
 * same kind of thing. The most common wrong answer (summing every
 * coefficient regardless of kind) is deliberately offered as a distractor
 * and, when picked, named directly rather than just marked wrong.
 *
 * Training Mode, practice only (`supportsChallenge: false`).
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { formatLinearExpr, formatTerms, simplifyTerms, type AlgebraTerm, type LinearExpr } from '../../utils/algebra';
import { shuffle } from '../../utils/shuffle';

export const ALGEBRA_LIKE_TERMS_ID = 'algebraLikeTerms';
export const ALGEBRA_LIKE_TERMS_RULES_VERSION = 1;

export interface LikeTermsPayload {
  terms: AlgebraTerm[];
}

export type LikeTermsMistake = 'combinedUnlikeTerms' | 'droppedASign' | 'other';

const OPTION_COUNT = 4;

interface DifficultySpec {
  /** How many variable terms and how many constant terms to generate. */
  variableTermCount: number;
  constantTermCount: number;
  allowNegativeCoefficients: boolean;
  coefficientRange: [number, number];
}

const DIFFICULTY_SPECS: Record<string, DifficultySpec> = {
  basic: { variableTermCount: 2, constantTermCount: 0, allowNegativeCoefficients: false, coefficientRange: [1, 6] },
  intermediate: { variableTermCount: 2, constantTermCount: 1, allowNegativeCoefficients: false, coefficientRange: [1, 6] },
  hard: { variableTermCount: 2, constantTermCount: 2, allowNegativeCoefficients: true, coefficientRange: [1, 7] },
};

/**
 * One non-zero coefficient per the spec's range, optionally signed. Built
 * deliberately rather than by chance so the kind of term (variable or
 * constant), how many of each, and whether a sign appears are all guaranteed
 * by construction instead of hoped for across enough random draws — a
 * generator this small should never need a statistical argument for why its
 * own invariants usually hold.
 */
function buildCoefficient(spec: DifficultySpec, allowNegative: boolean, random: RandomSource): number {
  const magnitude = randomInt(random, spec.coefficientRange[0], spec.coefficientRange[1]);
  return allowNegative && spec.allowNegativeCoefficients && randomOf(random, [true, false]) ? -magnitude : magnitude;
}

/** Builds one group of terms (all variable, or all constant) whose coefficients sum to something non-zero. */
function buildTermGroup(spec: DifficultySpec, count: number, isVariable: boolean, random: RandomSource): AlgebraTerm[] {
  if (count === 0) return [];
  // The first term of a group is never negative — "4x - 2x" is the taught
  // shape, not "-2x + 4x" — only later terms in the group may carry a sign.
  let terms: AlgebraTerm[];
  let guard = 0;
  do {
    guard += 1;
    terms = Array.from({ length: count }, (_, index) => ({
      coefficient: buildCoefficient(spec, index > 0, random),
      isVariable,
    }));
  } while (terms.reduce((sum, term) => sum + term.coefficient, 0) === 0 && guard < 50);
  return terms;
}

function buildTerms(spec: DifficultySpec, random: RandomSource): AlgebraTerm[] {
  const variableTerms = buildTermGroup(spec, spec.variableTermCount, true, random);
  const constantTerms = buildTermGroup(spec, spec.constantTermCount, false, random);
  // Interleave the two groups (constants can appear before, between or after
  // the x-terms) rather than always grouping all of one kind together —
  // sorting them apart would quietly teach "like terms are the ones already
  // next to each other", which is exactly backwards.
  const terms = [...variableTerms, ...constantTerms];
  for (let i = terms.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [terms[i], terms[j]] = [terms[j], terms[i]];
  }
  return terms;
}

function uniqueExpressionOptions(random: RandomSource, priorityCandidates: LinearExpr[], correct: LinearExpr): string[] {
  const correctText = formatLinearExpr(correct);
  const seen = new Set<string>([correctText]);
  const options: string[] = [];

  for (const candidate of priorityCandidates) {
    const text = formatLinearExpr(candidate);
    if (seen.has(text)) continue;
    seen.add(text);
    options.push(text);
    if (options.length === OPTION_COUNT - 1) break;
  }

  let guard = 0;
  while (options.length < OPTION_COUNT - 1 && guard < 200) {
    guard += 1;
    const candidate: LinearExpr = {
      coefficient: correct.coefficient + randomInt(random, 1, 3) * randomOf(random, [-1, 1]),
      constant: correct.constant + randomInt(random, 1, 3) * randomOf(random, [-1, 1]),
    };
    const text = formatLinearExpr(candidate);
    if (seen.has(text)) continue;
    seen.add(text);
    options.push(text);
  }

  return shuffle([correctText, ...options], random);
}

function buildQuestion(difficultyId: string | null, random: RandomSource): TrainingQuestion<LikeTermsPayload> {
  const spec = DIFFICULTY_SPECS[difficultyId ?? 'basic'] ?? DIFFICULTY_SPECS.basic;
  const terms = buildTerms(spec, random);
  const correct = simplifyTerms(terms);

  // The defining misconception this activity exists to correct: summing
  // every coefficient as though x-terms and constants were interchangeable.
  const combinedUnlikeTerms: LinearExpr = { coefficient: terms.reduce((sum, term) => sum + term.coefficient, 0), constant: 0 };
  // Dropping a minus sign on one of the terms (only meaningful when one exists).
  const negativeIndex = terms.findIndex((term) => term.coefficient < 0);
  const droppedASign =
    negativeIndex === -1
      ? null
      : simplifyTerms(terms.map((term, index) => (index === negativeIndex ? { ...term, coefficient: -term.coefficient } : term)));

  const priorityCandidates = [combinedUnlikeTerms, ...(droppedASign ? [droppedASign] : [])].filter(
    (candidate) => formatLinearExpr(candidate) !== formatLinearExpr(correct),
  );

  return {
    id: `like-${terms.map((t) => `${t.coefficient}${t.isVariable ? 'x' : ''}`).join('-')}-${Math.floor(random() * 1_000_000)}`,
    prompt: formatTerms(terms),
    answer: formatLinearExpr(correct),
    options: uniqueExpressionOptions(random, priorityCandidates, correct),
    payload: { terms },
  };
}

export function buildLikeTermsQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<LikeTermsPayload>[] {
  return Array.from({ length: count }, () => buildQuestion(difficultyId, random));
}

export const algebraLikeTermsActivity: TrainingActivityDefinition<LikeTermsPayload> = {
  id: ALGEBRA_LIKE_TERMS_ID,
  i18nPrefix: 'algebraLikeTerms',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'algebraLikeTerms.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'algebraLikeTerms.difficulty.intermediate' },
      { id: 'hard', labelKey: 'training.difficulty.hard', descriptionKey: 'algebraLikeTerms.difficulty.hard' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: ALGEBRA_LIKE_TERMS_RULES_VERSION,
  },
  generateQuestions: (input) => buildLikeTermsQuestions(input),
};

/** Names why a wrong pick was wrong, for differentiated feedback. */
export function classifyLikeTermsMistake(terms: AlgebraTerm[], picked: string): LikeTermsMistake {
  const correct = simplifyTerms(terms);
  const combinedUnlikeTerms = formatLinearExpr({ coefficient: terms.reduce((sum, term) => sum + term.coefficient, 0), constant: 0 });
  if (picked === combinedUnlikeTerms && combinedUnlikeTerms !== formatLinearExpr(correct)) return 'combinedUnlikeTerms';

  for (let i = 0; i < terms.length; i += 1) {
    if (terms[i].coefficient >= 0) continue;
    const flipped = simplifyTerms(terms.map((term, index) => (index === i ? { ...term, coefficient: -term.coefficient } : term)));
    if (picked === formatLinearExpr(flipped)) return 'droppedASign';
  }
  return 'other';
}

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertLikeTermsQuestionIsSound(question: TrainingQuestion<LikeTermsPayload>): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid like-terms question (${question.id}): ${reason}`);
  };

  if (!question.payload) fail('missing payload');
  const { terms } = question.payload!;
  if (terms.filter((term) => term.isVariable).length < 2) fail('fewer than two x-terms — nothing to combine');

  const correct = simplifyTerms(terms);
  if (formatLinearExpr(correct) !== question.answer) fail('the answer does not match simplifying the terms');
  if (new Set(question.options).size !== question.options.length) fail('duplicate options');
  if (question.options.length !== OPTION_COUNT) fail(`expected ${OPTION_COUNT} options, got ${question.options.length}`);
  if (!question.options.includes(question.answer)) fail('the answer is not among its own options');
}
