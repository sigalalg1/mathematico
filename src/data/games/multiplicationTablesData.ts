import type { MultiplicationFact } from '../../types/monkeyBalloonShooter';
import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { shuffle } from '../../utils/shuffle';
import { meaningfulDistractors, multiplicationFact } from './multiplicationFacts';

export const MULTIPLICATION_TABLES_ID = 'multiplicationTables';

/** One correct product plus three plausible distractors. */
export const MULTIPLICATION_TABLES_CHOICES = 4;

/**
 * Bump when the facts a difficulty covers, or the way questions are built,
 * materially changes — old personal bests then stop competing against a
 * different set of questions instead of silently becoming unbeatable.
 */
export const MULTIPLICATION_TABLES_RULES_VERSION = 1;

/**
 * The tables a 9-10 year old meets first (the same split the balloon game
 * already uses), versus the ones that come later and stay effortful longest.
 */
const EARLY_FACTORS = [2, 3, 4, 5, 10];
const LATE_FACTORS = [6, 7, 8, 9];

export type MultiplicationTablesDifficultyId = 'basic' | 'intermediate' | 'hard';

/**
 * Difficulty here means *which times tables are involved*, which is how the
 * curriculum itself grades this skill — not an arbitrary numeric band. Kept as
 * plain data so the groupings can be re-tuned later in one place.
 */
const DIFFICULTY_FACTORS: Record<MultiplicationTablesDifficultyId, { left: number[]; right: number[] }> = {
  // The early tables only: 2, 3, 4, 5 and 10 against each other.
  basic: { left: EARLY_FACTORS, right: EARLY_FACTORS },
  // One late table against an early one — 7 × 4, 3 × 8: the usual next step.
  intermediate: { left: LATE_FACTORS, right: EARLY_FACTORS },
  // The hard core of the table: 6, 7, 8 and 9 against each other — 7 × 8, 6 × 9.
  hard: { left: LATE_FACTORS, right: LATE_FACTORS },
};

/**
 * Both orientations of a pair are kept (7 × 8 and 8 × 7): in a fluency drill
 * they are two genuinely different recall prompts, unlike in the balloon game
 * where they would just be the same question twice.
 */
export function multiplicationTablesPool(difficultyId: string | null): MultiplicationFact[] {
  const group = DIFFICULTY_FACTORS[(difficultyId ?? 'basic') as MultiplicationTablesDifficultyId] ?? DIFFICULTY_FACTORS.basic;
  const facts: MultiplicationFact[] = [];

  for (const left of group.left) {
    for (const right of group.right) {
      facts.push(multiplicationFact(left, right));
      // Levels drawing both factors from one list already produce the swapped
      // orientation on a later pass; the mixed level has to add it explicitly.
      if (group.left !== group.right) facts.push(multiplicationFact(right, left));
    }
  }

  return facts;
}

/**
 * Draws `count` facts, cycling through a reshuffled pool when more questions
 * are asked than the level has distinct facts (a 50-question run always
 * repeats — that is the point of a fluency drill). Never repeats a fact twice
 * in a row.
 */
function drawFacts(pool: MultiplicationFact[], count: number): MultiplicationFact[] {
  const drawn: MultiplicationFact[] = [];
  let bag: MultiplicationFact[] = [];

  while (drawn.length < count) {
    if (bag.length === 0) {
      bag = shuffle(pool);
      const previous = drawn[drawn.length - 1];
      // Re-seat a repeat that would straddle the shuffle boundary.
      if (previous && bag.length > 1 && bag[0].left === previous.left && bag[0].right === previous.right) {
        bag.push(bag.shift()!);
      }
    }
    drawn.push(bag.shift()!);
  }

  return drawn;
}

export function buildMultiplicationTablesQuestions(input: {
  difficultyId: string | null;
  count: number;
}): TrainingQuestion[] {
  return drawFacts(multiplicationTablesPool(input.difficultyId), input.count).map((fact, index) => ({
    id: `mt-${index}`,
    prompt: `${fact.left} × ${fact.right}`,
    answer: String(fact.product),
    options: shuffle([fact.product, ...meaningfulDistractors(fact, MULTIPLICATION_TABLES_CHOICES - 1)]).map(String),
  }));
}

export const multiplicationTablesActivity: TrainingActivityDefinition = {
  id: MULTIPLICATION_TABLES_ID,
  i18nPrefix: 'multiplicationTables',
  capabilities: {
    questionCounts: [5, 10, 20, 50],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'multiplicationTables.difficulty.basic' },
      {
        id: 'intermediate',
        labelKey: 'training.difficulty.intermediate',
        descriptionKey: 'multiplicationTables.difficulty.intermediate',
      },
      { id: 'hard', labelKey: 'training.difficulty.hard', descriptionKey: 'multiplicationTables.difficulty.hard' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: true,
    // 5 and 10 are too short to say anything about fluency — one lucky or
    // unlucky question would move the record.
    challengeQuestionCounts: [20, 50],
    // A speed record for times-table fluency only counts on a flawless run.
    paceRecordMinAccuracy: 1,
    rulesVersion: MULTIPLICATION_TABLES_RULES_VERSION,
  },
  generateQuestions: buildMultiplicationTablesQuestions,
};
