import { describe, expect, it } from 'vitest';
import { assertSubstitutionQuestionIsSound, buildSubstitutionQuestions } from '../algebraSubstitutionData';
import { seededRandom } from '../../../utils/random';
import { evalLinearExpr } from '../../../utils/algebra';

const DIFFICULTIES = ['basic', 'intermediate', 'hard'];
const SAMPLES_PER_CASE = 400;

const byDifficulty = Object.fromEntries(
  DIFFICULTIES.map((difficultyId) => [
    difficultyId,
    buildSubstitutionQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)),
  ]),
);
const all = Object.values(byDifficulty).flat();

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const question of all) expect(() => assertSubstitutionQuestionIsSound(question)).not.toThrow();
  });

  it('the answer always equals the expression evaluated at x', () => {
    for (const question of all) {
      const { expr, x } = question.payload!;
      expect(Number(question.answer)).toBe(evalLinearExpr(expr, x));
    }
  });

  it('options are unique and include the answer', () => {
    for (const question of all) {
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options).toContain(question.answer);
    }
  });

  it('basic questions use only one operation (coefficient 1, or a zero constant)', () => {
    for (const question of byDifficulty.basic) {
      const { expr } = question.payload!;
      expect(expr.coefficient === 1 || expr.constant === 0).toBe(true);
    }
  });

  it('intermediate and hard questions always use two operations', () => {
    for (const question of [...byDifficulty.intermediate, ...byDifficulty.hard]) {
      const { expr } = question.payload!;
      expect(expr.coefficient).not.toBe(1);
      expect(expr.constant).not.toBe(0);
    }
  });

  it('hard questions substitute a negative x, reusing Signed Numbers', () => {
    expect(byDifficulty.hard.length).toBeGreaterThan(0);
    for (const question of byDifficulty.hard) {
      expect(question.payload!.x).toBeLessThan(0);
    }
  });

  it('never divides by zero or produces a meaningless coefficient-0 question', () => {
    for (const question of all) expect(question.payload!.expr.coefficient).not.toBe(0);
  });
});

describe('the classic substitution slips are offered when they apply', () => {
  it('a negative-x question offers the "dropped the sign" distractor', () => {
    const negativeX = byDifficulty.hard.filter((q) => q.payload!.x < 0 && q.payload!.expr.coefficient !== 1);
    expect(negativeX.length).toBeGreaterThan(0);
    for (const question of negativeX) {
      const { expr, x } = question.payload!;
      const droppedSign = String(expr.coefficient * Math.abs(x) + expr.constant);
      if (droppedSign !== question.answer) expect(question.options).toContain(droppedSign);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  it('rejects an answer missing from its own options', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.answer = '__not-an-option__';
    expect(() => assertSubstitutionQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate options', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.options[1] = corrupted.options[0];
    expect(() => assertSubstitutionQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects an answer that does not match the expression at x', () => {
    const corrupted = structuredClone(all[0]);
    const wrong = String(Number(corrupted.answer) + 1);
    corrupted.answer = wrong;
    corrupted.options = [wrong, ...corrupted.options.slice(1)];
    expect(() => assertSubstitutionQuestionIsSound(corrupted)).toThrow();
  });
});
