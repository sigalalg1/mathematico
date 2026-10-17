/**
 * Shared question model for the Grade 4 "Decimal Place Value" exam-prep
 * unit. All eight skills, the diagnostic and the mock exam build on this one
 * type family and render through the same `PlaceValueQuestionScene`
 * component — this is what keeps the unit one cohesive experience instead
 * of eight disconnected mini-games.
 */

export type PlaceValueSkillId =
  | 'placeValue'
  | 'decomposition'
  | 'ordering'
  | 'rounding'
  | 'arithmetic'
  | 'parity'
  | 'constraints'
  | 'wordProblems';

export const PLACE_VALUE_SKILL_IDS: PlaceValueSkillId[] = [
  'placeValue',
  'decomposition',
  'ordering',
  'rounding',
  'arithmetic',
  'parity',
  'constraints',
  'wordProblems',
];

export type PlaceValueDifficulty = 'basic' | 'intermediate' | 'advanced';

/**
 * The four interaction shapes used across the whole unit. Chosen to be
 * genuinely different from each other (not just re-skinned multiple
 * choice), while staying small enough that every skill's generator only
 * ever has to target one of these four contracts rather than inventing a
 * new one per question:
 *
 * - `multipleChoice` — pick one of several options (also used for "order
 *   these numbers" and "round to the nearest..." by offering full
 *   candidate answers rather than a free-form sequence builder).
 * - `numericInput` — type a number; the canonical use for calculation,
 *   missing-digit/missing-number and constraint questions. May have more
 *   than one valid answer (see `hasMultipleValidAnswers`).
 * - `compareSymbol` — choose <, = or > between two shown numbers.
 * - `constructChoice` — tap exactly two numbers from a small palette plus
 *   one operation, to build an expression satisfying a condition (parity,
 *   threshold, target sum). The defining interaction for Skill 6 and part
 *   of Skill 7 — never a prewritten multiple-choice stand-in for it.
 * - `evenOddChoice` — judge a result's parity without fully calculating it.
 *   Kept separate from `multipleChoice` (whose options render as raw,
 *   untranslated math via MathText) because "even"/"odd" are words that
 *   need translating — the scene resolves them via
 *   `decimalExamPrep.common.even`/`.odd`, the one place in this unit a
 *   question's own UI text is translated outside a `promptKey`.
 */
export type PlaceValueInteraction =
  | { kind: 'multipleChoice'; options: string[] }
  | { kind: 'numericInput'; placeholderExample?: string }
  | { kind: 'compareSymbol'; left: string; right: string }
  | { kind: 'constructChoice'; numbers: number[]; operations: ('+' | '-')[] }
  | { kind: 'evenOddChoice' };

export interface PlaceValueQuestion {
  id: string;
  skillId: PlaceValueSkillId;
  difficulty: PlaceValueDifficulty;
  interaction: PlaceValueInteraction;
  /** The math shown as the question's hero line, e.g. "46,205 − 2,000". Rendered via MathText (LTR). */
  display: string;
  /** i18n key for the short instruction line above the math, e.g. "What is the result?". */
  promptKey: string;
  promptParams?: Record<string, string | number>;
  /** i18n key for the short feedback explanation shown after answering. */
  explanationKey: string;
  explanationParams?: Record<string, string | number>;
  /**
   * The one answer shown in feedback as "a correct answer" — for
   * multiple-valid-answer questions this is just one valid example, never
   * implied to be the only one.
   */
  correctAnswerDisplay: string;
  /** True when more than one input could be correct (validated by `validate`, not string equality). */
  hasMultipleValidAnswers: boolean;
  /** The single source of truth for correctness — always used, even for single-answer questions. */
  validate: (raw: string) => boolean;
}
