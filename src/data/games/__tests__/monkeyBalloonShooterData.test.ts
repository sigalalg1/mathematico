import { describe, expect, it } from 'vitest';
import { BALLOONS_PER_QUESTION, MONKEY_SHOOTER_TOTAL, buildMonkeyShooterQuestions } from '../monkeyBalloonShooterData';
import type { ShooterQuestion } from '../../../types/monkeyBalloonShooter';

const RUNS = 200;
const SESSIONS: ShooterQuestion[][] = Array.from({ length: RUNS }, () => buildMonkeyShooterQuestions());
const ALL = SESSIONS.flat();

const EASY = [2, 3, 4, 5, 10];

describe('monkey balloon shooter — generated questions', () => {
  it('builds a full session of distinct facts', () => {
    for (const session of SESSIONS) {
      expect(session).toHaveLength(MONKEY_SHOOTER_TOTAL);
      const facts = session.map((question) => `${question.fact.left}x${question.fact.right}`);
      expect(new Set(facts).size).toBe(MONKEY_SHOOTER_TOTAL);
    }
  });

  it('only asks facts from the 2-10 tables, with a correct product', () => {
    for (const { fact } of ALL) {
      expect(fact.left).toBeGreaterThanOrEqual(2);
      expect(fact.left).toBeLessThanOrEqual(10);
      expect(fact.right).toBeGreaterThanOrEqual(2);
      expect(fact.right).toBeLessThanOrEqual(10);
      expect(fact.product).toBe(fact.left * fact.right);
    }
  });

  it('opens with easy factors and saves the harder tables for later', () => {
    for (const session of SESSIONS) {
      const half = MONKEY_SHOOTER_TOTAL / 2;
      for (const { fact } of session.slice(0, half)) {
        expect(EASY).toContain(fact.left);
        expect(EASY).toContain(fact.right);
      }
      for (const { fact } of session.slice(half)) {
        expect(EASY.includes(fact.left) && EASY.includes(fact.right)).toBe(false);
      }
    }
  });

  it('floats four balloons with exactly one correct answer per question', () => {
    for (const question of ALL) {
      expect(question.options).toHaveLength(BALLOONS_PER_QUESTION);
      expect(question.options.filter((option) => option === question.fact.product)).toHaveLength(1);
    }
  });

  it('keeps every balloon value distinct and positive', () => {
    for (const question of ALL) {
      expect(new Set(question.options).size).toBe(BALLOONS_PER_QUESTION);
      for (const option of question.options) {
        expect(option).toBeGreaterThan(0);
      }
    }
  });

  it('draws distractors from the times table around the fact, not random numbers', () => {
    for (const question of ALL) {
      const { left, right, product } = question.fact;
      const plausible = new Set([
        (left - 1) * right,
        (left + 1) * right,
        (left + 2) * right,
        left * (right - 1),
        left * (right + 1),
        left * (right + 2),
        left * left,
        right * right,
        (left - 1) * (right + 1),
        (left + 1) * (right - 1),
        product + 1,
        product - 1,
        product + 2,
      ]);
      for (const option of question.options) {
        if (option === product) continue;
        expect(plausible.has(option)).toBe(true);
      }
    }
  });
});
