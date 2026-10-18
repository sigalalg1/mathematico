/**
 * Grade 7 Algebra — Activity 2: Build an Expression (בונים ביטוי).
 *
 * Translates a short verbal description ("three times a number, then add 7")
 * into the algebraic expression it describes. A repeatable multiple-choice
 * drill, not a one-time conceptual walkthrough, so it runs on Training Mode —
 * practice only (`supportsChallenge: false`): this is about recognising the
 * correct translation, not about speed.
 *
 * Every phrase is an i18n-interpolated template (`algebraExpressions.phrases.*`)
 * rather than a hardcoded English string, so the question itself is fully
 * translated, not just its chrome.
 */
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { formatLinearExpr, type LinearExpr } from '../../utils/algebra';
import { shuffle } from '../../utils/shuffle';

export const ALGEBRA_EXPRESSIONS_ID = 'algebraExpressions';
export const ALGEBRA_EXPRESSIONS_RULES_VERSION = 1;

export type ExpressionTemplateId = 'plus' | 'minus' | 'minusReversed' | 'timesOnly' | 'timesPlus' | 'moreThanTimes' | 'divide';

export interface ExpressionPayload {
  templateId: ExpressionTemplateId;
  n: number;
  n2: number | null;
}

interface ExpressionTemplate {
  id: ExpressionTemplateId;
  phraseKey: string;
  nRange: [number, number];
  n2Range: [number, number] | null;
  /** `null` when the correct form isn't a plain `coefficient*x + constant` (e.g. division). */
  buildExpr: (n: number, n2: number | null) => LinearExpr | null;
  /** The canonical answer text — derived from `buildExpr` when possible, literal otherwise. */
  formatAnswer: (n: number, n2: number | null) => string;
  difficulty: 'basic' | 'intermediate' | 'hard';
}

const TEMPLATES: ExpressionTemplate[] = [
  {
    id: 'plus',
    phraseKey: 'algebraExpressions.phrases.plus',
    nRange: [2, 9],
    n2Range: null,
    buildExpr: (n) => ({ coefficient: 1, constant: n }),
    formatAnswer: (n) => formatLinearExpr({ coefficient: 1, constant: n }),
    difficulty: 'basic',
  },
  {
    id: 'minus',
    phraseKey: 'algebraExpressions.phrases.minus',
    nRange: [2, 9],
    n2Range: null,
    buildExpr: (n) => ({ coefficient: 1, constant: -n }),
    formatAnswer: (n) => formatLinearExpr({ coefficient: 1, constant: -n }),
    difficulty: 'basic',
  },
  {
    id: 'minusReversed',
    phraseKey: 'algebraExpressions.phrases.minusReversed',
    nRange: [2, 9],
    n2Range: null,
    buildExpr: (n) => ({ coefficient: 1, constant: -n }),
    formatAnswer: (n) => formatLinearExpr({ coefficient: 1, constant: -n }),
    difficulty: 'basic',
  },
  {
    id: 'timesOnly',
    phraseKey: 'algebraExpressions.phrases.timesOnly',
    nRange: [2, 9],
    n2Range: null,
    buildExpr: (n) => ({ coefficient: n, constant: 0 }),
    formatAnswer: (n) => formatLinearExpr({ coefficient: n, constant: 0 }),
    difficulty: 'basic',
  },
  {
    id: 'timesPlus',
    phraseKey: 'algebraExpressions.phrases.timesPlus',
    nRange: [2, 6],
    n2Range: [2, 9],
    buildExpr: (n, n2) => ({ coefficient: n, constant: n2 ?? 0 }),
    formatAnswer: (n, n2) => formatLinearExpr({ coefficient: n, constant: n2 ?? 0 }),
    difficulty: 'intermediate',
  },
  {
    id: 'moreThanTimes',
    phraseKey: 'algebraExpressions.phrases.moreThanTimes',
    nRange: [2, 6],
    n2Range: [2, 9],
    buildExpr: (n, n2) => ({ coefficient: n, constant: n2 ?? 0 }),
    formatAnswer: (n, n2) => formatLinearExpr({ coefficient: n, constant: n2 ?? 0 }),
    difficulty: 'intermediate',
  },
  {
    id: 'divide',
    phraseKey: 'algebraExpressions.phrases.divide',
    nRange: [2, 4],
    n2Range: null,
    buildExpr: () => null,
    formatAnswer: (n) => `x / ${n}`,
    difficulty: 'hard',
  },
];

const TEMPLATES_BY_DIFFICULTY: Record<string, ExpressionTemplate[]> = {
  basic: TEMPLATES.filter((template) => template.difficulty === 'basic'),
  intermediate: TEMPLATES.filter((template) => template.difficulty !== 'hard'),
  hard: TEMPLATES,
};

const OPTION_COUNT = 4;

/**
 * Distractors a student who mistranslates the phrase would plausibly pick.
 * `priority` distractors (the specific misconception this template is prone
 * to, e.g. the subtraction-order slip) are always offered when they exist;
 * `filler` only tops the set up to size, and is the part that gets shuffled
 * and trimmed — so a random slice can never silently drop the one distractor
 * the question was actually designed to test.
 */
function buildDistractors(template: ExpressionTemplate, n: number, n2: number | null, correct: string, random: RandomSource): string[] {
  const priority = new Set<string>();
  const filler = new Set<string>();

  // The classic subtraction-order slip: "n less than a number" read as "n - x".
  if (template.id === 'minus' || template.id === 'minusReversed') {
    priority.add(`${n} - x`);
  }

  const expr = template.buildExpr(n, n2);
  if (expr) {
    // Wrong operation: + instead of -, or vice versa.
    if (expr.constant !== 0) priority.add(formatLinearExpr({ coefficient: expr.coefficient, constant: -expr.constant }));
    // Added instead of multiplied, the other common slip.
    if (expr.coefficient !== 1 && expr.coefficient !== 0) {
      priority.add(formatLinearExpr({ coefficient: 1, constant: expr.coefficient }));
    }
    // "times a number, then add" confused with "times (a number plus n2)".
    if (n2 !== null && expr.coefficient !== 0) {
      priority.add(formatLinearExpr({ coefficient: expr.coefficient, constant: expr.coefficient * n2 }));
    }
    // Off-by-one on the coefficient or the constant — plausible but generic.
    filler.add(formatLinearExpr({ coefficient: expr.coefficient + 1, constant: expr.constant }));
    filler.add(formatLinearExpr({ coefficient: expr.coefficient, constant: expr.constant + randomOf(random, [-1, 1]) }));
  } else {
    // "a number divided by n" confused with "n divided by a number" or "times n".
    priority.add(`${n} / x`);
    priority.add(`${n}x`);
    filler.add(`x + ${n}`);
    filler.add(`x - ${n}`);
  }

  priority.delete(correct);
  filler.delete(correct);

  const ordered = [...priority, ...shuffle([...filler], random)];
  const unique: string[] = [];
  for (const candidate of ordered) {
    if (unique.length === OPTION_COUNT - 1) break;
    if (unique.includes(candidate)) continue;
    unique.push(candidate);
  }
  return unique;
}

function buildQuestion(difficultyId: string | null, random: RandomSource): TrainingQuestion<ExpressionPayload> {
  const pool = TEMPLATES_BY_DIFFICULTY[difficultyId ?? 'basic'] ?? TEMPLATES_BY_DIFFICULTY.basic;
  const template = randomOf(random, pool);
  const n = randomInt(random, template.nRange[0], template.nRange[1]);
  const n2 = template.n2Range ? randomInt(random, template.n2Range[0], template.n2Range[1]) : null;
  const answer = template.formatAnswer(n, n2);
  const distractors = buildDistractors(template, n, n2, answer, random);

  // A generator bug (e.g. every distractor collapsing to the same string)
  // must never silently ship a one-option question.
  while (distractors.length < OPTION_COUNT - 1) {
    const filler = formatLinearExpr({ coefficient: randomInt(random, 2, 9), constant: randomInt(random, -9, 9) });
    if (filler !== answer && !distractors.includes(filler)) distractors.push(filler);
  }

  return {
    id: `expr-${template.id}-${n}-${n2 ?? 'x'}-${Math.floor(random() * 1_000_000)}`,
    // Never shown — the real, translated phrase is rendered by the custom
    // scene via `payload`. This just satisfies the engine's "every question
    // has a non-empty prompt" contract for any code path that reads it
    // generically (e.g. a future fallback to the default renderer).
    prompt: `${template.id}(${n}${n2 !== null ? `, ${n2}` : ''})`,
    answer,
    options: shuffle([answer, ...distractors], random),
    payload: { templateId: template.id, n, n2 },
  };
}

export function buildExpressionQuestions(
  { difficultyId, count }: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<ExpressionPayload>[] {
  return Array.from({ length: count }, () => buildQuestion(difficultyId, random));
}

export const algebraExpressionsActivity: TrainingActivityDefinition<ExpressionPayload> = {
  id: ALGEBRA_EXPRESSIONS_ID,
  i18nPrefix: 'algebraExpressions',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'algebraExpressions.difficulty.basic' },
      { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'algebraExpressions.difficulty.intermediate' },
      { id: 'hard', labelKey: 'training.difficulty.hard', descriptionKey: 'algebraExpressions.difficulty.hard' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: false,
    challengeQuestionCounts: [],
    paceRecordMinAccuracy: 1,
    rulesVersion: ALGEBRA_EXPRESSIONS_RULES_VERSION,
  },
  generateQuestions: (input) => buildExpressionQuestions(input),
};

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertExpressionQuestionIsSound(question: TrainingQuestion<ExpressionPayload>): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid expression question (${question.id}): ${reason}`);
  };

  if (new Set(question.options).size !== question.options.length) fail('duplicate options');
  if (question.options.length !== OPTION_COUNT) fail(`expected ${OPTION_COUNT} options, got ${question.options.length}`);
  if (!question.options.includes(question.answer)) fail('the answer is not among its own options');
  if (!question.payload) fail('missing payload');

  const template = TEMPLATES.find((candidate) => candidate.id === question.payload!.templateId);
  if (!template) fail('unknown template id');
  else {
    const expected = template.formatAnswer(question.payload!.n, question.payload!.n2);
    if (expected !== question.answer) fail('the answer does not match its own template');
  }
}
