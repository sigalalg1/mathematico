import { describe, expect, it } from 'vitest';
import {
  BASKETBALL_MONKEY_CHOICES,
  basketballDistractors,
  buildBasketballMonkeyQuestions,
  generateBasketballFact,
  seededRandom,
  type BasketballDifficultyId,
} from '../basketballMonkeyData';

const LEVELS: BasketballDifficultyId[] = ['basic', 'intermediate', 'hard'];

describe('Basketball Monkey generator', () => {
  it.each(LEVELS)('is seeded and reproducible for %s', (difficultyId) => {
    const first = buildBasketballMonkeyQuestions({ difficultyId, count: 20 }, seededRandom(42));
    const second = buildBasketballMonkeyQuestions({ difficultyId, count: 20 }, seededRandom(42));
    expect(first).toEqual(second);
  });

  it.each(LEVELS)('builds valid two-digit by one-digit questions for %s', (difficultyId) => {
    const questions = buildBasketballMonkeyQuestions({ difficultyId, count: 80 }, seededRandom(7));

    expect(questions).toHaveLength(80);
    for (const question of questions) {
      const [first, second] = question.prompt.split(' × ').map(Number);
      expect(first).toBeGreaterThanOrEqual(10);
      expect(first).toBeLessThanOrEqual(99);
      expect(second).toBeGreaterThanOrEqual(2);
      expect(second).toBeLessThanOrEqual(9);
      expect(Number(question.answer)).toBe(first * second);
      expect(question.options).toHaveLength(BASKETBALL_MONKEY_CHOICES);
      expect(new Set(question.options).size).toBe(BASKETBALL_MONKEY_CHOICES);
      expect(question.options.filter((value) => value === question.answer)).toHaveLength(1);
    }
  });

  it('keeps basic facts smaller and free of regrouping', () => {
    const random = seededRandom(81);
    for (let index = 0; index < 120; index += 1) {
      const fact = generateBasketballFact('basic', random);
      expect(fact.first).toBeGreaterThanOrEqual(20);
      expect(fact.first).toBeLessThanOrEqual(49);
      expect(fact.second).toBeGreaterThanOrEqual(2);
      expect(fact.second).toBeLessThanOrEqual(5);
      expect(fact.requiresRegrouping).toBe(false);
      expect((fact.first % 10) * fact.second).toBeLessThan(10);
    }
  });

  it.each(['intermediate', 'hard'] as const)('%s facts always require regrouping', (difficultyId) => {
    const random = seededRandom(difficultyId === 'hard' ? 13 : 12);
    for (let index = 0; index < 120; index += 1) {
      const fact = generateBasketballFact(difficultyId, random);
      expect(fact.requiresRegrouping).toBe(true);
      expect((fact.first % 10) * fact.second).toBeGreaterThanOrEqual(10);
      if (difficultyId === 'hard') {
        expect(fact.first).toBeGreaterThanOrEqual(60);
        expect(fact.second).toBeGreaterThanOrEqual(6);
      } else {
        expect(fact.first).toBeGreaterThanOrEqual(25);
        expect(fact.first).toBeLessThanOrEqual(69);
      }
    }
  });

  it('uses only unique, plausible calculation-error distractors', () => {
    const random = seededRandom(2026);
    for (const difficultyId of LEVELS) {
      for (let index = 0; index < 100; index += 1) {
        const fact = generateBasketballFact(difficultyId, random);
        const values = basketballDistractors(fact, random);
        const tens = Math.floor(fact.first / 10);
        const ones = fact.first % 10;
        const missedCarry = tens * fact.second * 10 + ((ones * fact.second) % 10);
        const forgotOnesProduct = tens * fact.second * 10 + ones;

        expect(values).toHaveLength(3);
        expect(new Set(values).size).toBe(3);
        expect(values).not.toContain(fact.product);
        values.forEach((value) => {
          const nearbySlip =
            Math.abs(value - fact.product) === fact.second ||
            Math.abs(value - fact.product) === 10 ||
            Math.abs(value - fact.product) === fact.second * 10;
          expect(value > 0 && (nearbySlip || value === missedCarry || value === forgotOnesProduct)).toBe(true);
        });
      }
    }
  });

  it.each([5, 10, 20])('honours a %i-question session exactly', (count) => {
    expect(buildBasketballMonkeyQuestions({ difficultyId: 'intermediate', count }, seededRandom(count))).toHaveLength(count);
  });
});
