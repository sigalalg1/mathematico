import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { shuffle } from '../../utils/shuffle';
import { randomInt as integer, seededRandom, type RandomSource } from '../../utils/random';

export const BASKETBALL_MONKEY_ID = 'basketballMonkey';
export const BASKETBALL_MONKEY_CHOICES = 4;
export const BASKETBALL_MONKEY_RULES_VERSION = 1;

export type BasketballDifficultyId = 'basic' | 'intermediate' | 'hard';

/** Re-exported so existing callers keep importing the seed helper from here. */
export { seededRandom };
export type { RandomSource };

export interface BasketballFact {
  first: number;
  second: number;
  product: number;
  requiresRegrouping: boolean;
}

function difficultyOf(value: string | null): BasketballDifficultyId {
  return value === 'intermediate' || value === 'hard' ? value : 'basic';
}

/**
 * Difficulty changes the calculation, not just the labels: basic facts never
 * carry from the ones column, while intermediate and hard facts always do.
 */
export function generateBasketballFact(
  difficultyId: string | null,
  random: RandomSource = Math.random,
): BasketballFact {
  const difficulty = difficultyOf(difficultyId);
  const range =
    difficulty === 'basic'
      ? { firstMin: 20, firstMax: 49, secondMin: 2, secondMax: 5, carry: false }
      : difficulty === 'intermediate'
        ? { firstMin: 25, firstMax: 69, secondMin: 3, secondMax: 7, carry: true }
        : { firstMin: 60, firstMax: 99, secondMin: 6, secondMax: 9, carry: true };

  // Every range has many valid pairs; the cap is only defensive for a custom
  // random source that repeatedly returns the same edge value.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const first = integer(random, range.firstMin, range.firstMax);
    const second = integer(random, range.secondMin, range.secondMax);
    const requiresRegrouping = (first % 10) * second >= 10;
    if (requiresRegrouping === range.carry) {
      return { first, second, product: first * second, requiresRegrouping };
    }
  }

  const fallback =
    difficulty === 'basic'
      ? { first: 21, second: 3 }
      : difficulty === 'intermediate'
        ? { first: 27, second: 4 }
        : { first: 68, second: 7 };
  return {
    ...fallback,
    product: fallback.first * fallback.second,
    requiresRegrouping: (fallback.first % 10) * fallback.second >= 10,
  };
}

/**
 * Three distinct errors a child might genuinely make: dropping the carried
 * tens, shifting one partial product, or slipping to a neighbouring multiple.
 */
export function basketballDistractors(
  fact: BasketballFact,
  random: RandomSource = Math.random,
): number[] {
  const tens = Math.floor(fact.first / 10);
  const ones = fact.first % 10;
  const onesProduct = ones * fact.second;
  const missedCarry = tens * fact.second * 10 + (onesProduct % 10);
  const candidates = [
    missedCarry,
    fact.product - fact.second,
    fact.product + fact.second,
    fact.product - 10,
    fact.product + 10,
    tens * fact.second * 10 + ones,
    fact.product - fact.second * 10,
    fact.product + fact.second * 10,
  ];

  const chosen: number[] = [];
  const used = new Set([fact.product]);
  for (const candidate of shuffle(candidates, random)) {
    if (candidate <= 0 || used.has(candidate)) continue;
    used.add(candidate);
    chosen.push(candidate);
    if (chosen.length === BASKETBALL_MONKEY_CHOICES - 1) break;
  }
  return chosen;
}

export function buildBasketballMonkeyQuestions(
  input: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion[] {
  return Array.from({ length: input.count }, (_, index) => {
    const fact = generateBasketballFact(input.difficultyId, random);
    const distractors = basketballDistractors(fact, random);
    return {
      id: `basketball-${index}-${fact.first}-${fact.second}`,
      prompt: `${fact.first} × ${fact.second}`,
      answer: String(fact.product),
      options: shuffle([fact.product, ...distractors], random).map(String),
    };
  });
}

export const basketballMonkeyActivity: TrainingActivityDefinition = {
  id: BASKETBALL_MONKEY_ID,
  i18nPrefix: 'basketballMonkey',
  capabilities: {
    questionCounts: [5, 10, 20],
    defaultQuestionCount: 10,
    difficulties: [
      { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'basketballMonkey.difficulty.basic' },
      {
        id: 'intermediate',
        labelKey: 'training.difficulty.intermediate',
        descriptionKey: 'basketballMonkey.difficulty.intermediate',
      },
      { id: 'hard', labelKey: 'training.difficulty.hard', descriptionKey: 'basketballMonkey.difficulty.hard' },
    ],
    defaultDifficultyId: 'basic',
    supportsChallenge: true,
    challengeQuestionCounts: [10, 20],
    paceRecordMinAccuracy: 1,
    rulesVersion: BASKETBALL_MONKEY_RULES_VERSION,
  },
  generateQuestions: buildBasketballMonkeyQuestions,
};
