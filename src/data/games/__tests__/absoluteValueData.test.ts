import { describe, expect, it } from 'vitest';
import {
  ABSOLUTE_VALUE_CAPABILITIES,
  absoluteValue,
  assertAbsoluteChallengeIsSound,
  buildAbsoluteValueQuestions,
  comparisonFor,
} from '../absoluteValueData';

describe('absolute value mathematics', () => {
  it('is correct for positive, negative and zero values', () => {
    expect([absoluteValue(7), absoluteValue(-7), absoluteValue(0)]).toEqual([7, 7, 0]);
  });

  it('gives opposite numbers equal absolute values', () => {
    for (let n = -50; n <= 50; n++) expect(absoluteValue(n)).toBe(absoluteValue(-n));
    expect(comparisonFor(absoluteValue(-8), absoluteValue(8))).toBe('=');
  });

  it('handles the required expression and outside-minus examples', () => {
    expect(Math.abs(-3) + Math.abs(5)).toBe(8);
    expect(-Math.abs(-5)).toBe(-5);
    expect(-Math.abs(3)).toBe(-3);
  });
});

describe('absolute value seeded generator', () => {
  const generated = (['basic', 'intermediate', 'hard'] as const).flatMap((difficultyId) =>
    Array.from({ length: 300 }, (_, seed) =>
      buildAbsoluteValueQuestions({ difficultyId, count: 20, seed }),
    ).flat(),
  );

  it('is deterministic and supports the standard session lengths', () => {
    for (const count of ABSOLUTE_VALUE_CAPABILITIES.questionCounts) {
      const first = buildAbsoluteValueQuestions({ difficultyId: 'basic', count, seed: 42 });
      const second = buildAbsoluteValueQuestions({ difficultyId: 'basic', count, seed: 42 });
      expect(first).toEqual(second);
      expect(first).toHaveLength(count);
    }
  });

  it('has unique options and exactly one correct answer', () => {
    for (const question of generated) {
      expect(() => assertAbsoluteChallengeIsSound(question.payload!)).not.toThrow();
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
    }
  });

  it('generates the one mathematically correct comparison operator', () => {
    for (const question of generated.filter((item) => item.payload!.kind === 'compare')) {
      const [left, right] = question.payload!.values;
      expect(question.answer).toBe(comparisonFor(Math.abs(left), Math.abs(right)));
      expect(['<', '=', '>']).toContain(question.answer);
    }
  });

  it('uses conceptual complexity, not huge numbers, for difficulty', () => {
    const basic = generated.filter((q) => q.payload!.difficulty === 'basic');
    const intermediate = generated.filter((q) => q.payload!.difficulty === 'intermediate');
    const hard = generated.filter((q) => q.payload!.difficulty === 'hard');
    expect(basic.every((q) => q.payload!.values.every((n) => Math.abs(n) <= 10))).toBe(true);
    expect(intermediate.every((q) => q.payload!.values.every((n) => Math.abs(n) <= 20))).toBe(true);
    expect(hard.every((q) => q.payload!.values.every((n) => Math.abs(n) <= 12))).toBe(true);
    expect(new Set(hard.map((q) => q.payload!.kind))).toEqual(new Set(['expression', 'scope', 'compare']));
  });

  it('includes zero, signs, equality/opposites and intentional scope questions', () => {
    expect(generated.some((q) => q.payload!.values.includes(0))).toBe(true);
    expect(generated.some((q) => q.payload!.values.some((n) => n < 0))).toBe(true);
    expect(generated.some((q) => q.payload!.values.some((n) => n > 0))).toBe(true);
    expect(generated.some((q) => q.payload!.kind === 'compare' && q.answer === '=')).toBe(true);
    expect(generated.some((q) => q.payload!.kind === 'scope' && q.payload!.expression.startsWith('−|'))).toBe(true);
  });
});
