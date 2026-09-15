import { describe, expect, it } from 'vitest';
import {
  PENALTY_MAX_OPERAND,
  PENALTY_MIN_OPERAND,
  PENALTY_SHOOTOUT_COUNT,
  buildPenaltyShootoutMatch,
  hasRegrouping,
} from '../penaltyShootoutData';

function seededRandom(seed = 91) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('Penalty Shootout question generation', () => {
  it('builds eight unique, deterministic addition questions with correct results', () => {
    const first = buildPenaltyShootoutMatch(seededRandom());
    const second = buildPenaltyShootoutMatch(seededRandom());

    expect(first).toEqual(second);
    expect(first).toHaveLength(PENALTY_SHOOTOUT_COUNT);
    expect(new Set(first.map(({ left, right }) => `${left}+${right}`))).toHaveLength(PENALTY_SHOOTOUT_COUNT);
    for (const question of first) expect(question.answer).toBe(question.left + question.right);
  });

  it('keeps age-appropriate operands and progresses into three-digit regrouping', () => {
    const match = buildPenaltyShootoutMatch(seededRandom(12));
    for (const question of match) {
      expect(question.left).toBeGreaterThanOrEqual(PENALTY_MIN_OPERAND);
      expect(question.left).toBeLessThanOrEqual(PENALTY_MAX_OPERAND);
      expect(question.right).toBeGreaterThanOrEqual(PENALTY_MIN_OPERAND);
      expect(question.right).toBeLessThanOrEqual(PENALTY_MAX_OPERAND);
      expect(hasRegrouping(question.left, question.right)).toBe(true);
    }
    expect(match.slice(0, 5).every(({ left, right }) => left < 100 && right < 100)).toBe(true);
    expect(match.slice(6).every(({ left, right }) => left >= 100 && right >= 100)).toBe(true);
  });

  it('offers four unique choices with exactly one correct and realistic mistake patterns', () => {
    const match = buildPenaltyShootoutMatch(seededRandom(33));
    for (const question of match) {
      const values = question.choices.map((choice) => choice.value);
      expect(values).toHaveLength(4);
      expect(new Set(values)).toHaveLength(4);
      expect(values.filter((value) => value === question.answer)).toHaveLength(1);
      expect(values).toContain(question.answer - 10);
      expect(values.some((value) => Math.abs(value - question.answer) === 1)).toBe(true);
      expect(values.some((value) => Math.abs(value - question.answer) === 100)).toBe(true);
    }
  });
});
