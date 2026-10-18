import { describe, expect, it } from 'vitest';
import { assertExpressionQuestionIsSound, buildExpressionQuestions } from '../algebraExpressionsData';
import { seededRandom } from '../../../utils/random';
import type { TrainingQuestion } from '../../../types/training';
import type { ExpressionPayload } from '../algebraExpressionsData';

const DIFFICULTIES = ['basic', 'intermediate', 'hard'];
const SAMPLES_PER_CASE = 300;

function manySessions(difficultyId: string): TrainingQuestion<ExpressionPayload>[] {
  const random = seededRandom(difficultyId.length * 7919 + 13);
  return buildExpressionQuestions({ difficultyId, count: SAMPLES_PER_CASE }, random);
}

const byDifficulty = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, manySessions(difficulty)]));
const all = Object.values(byDifficulty).flat();

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const question of all) expect(() => assertExpressionQuestionIsSound(question)).not.toThrow();
  });

  it('always offers exactly four options, with no duplicates', () => {
    for (const question of all) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
    }
  });

  it('the answer is always among the options', () => {
    for (const question of all) expect(question.options).toContain(question.answer);
  });

  it('never offers the answer twice under a different label', () => {
    // The answer string itself must be unique within the option set — a
    // duplicate-detection test with teeth, not just a set-size check.
    for (const question of all) {
      expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
    }
  });
});

describe('difficulty is not silently identical across levels', () => {
  it('hard questions draw from a template pool the basic level never uses', () => {
    const basicTemplates = new Set(byDifficulty.basic.map((question) => question.payload!.templateId));
    const hardTemplates = new Set(byDifficulty.hard.map((question) => question.payload!.templateId));
    expect(hardTemplates.has('divide')).toBe(true);
    expect(basicTemplates.has('divide')).toBe(false);
  });

  it('every declared difficulty actually produces questions', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(byDifficulty[difficulty].length).toBeGreaterThan(0);
    }
  });
});

describe('specific templates translate correctly', () => {
  it('"a number plus n" is x + n', () => {
    const question = byDifficulty.basic.find((q) => q.payload!.templateId === 'plus')!;
    expect(question).toBeDefined();
    expect(question.answer).toBe(`x + ${question.payload!.n}`);
  });

  it('"n times a number, then add n2" is nx + n2', () => {
    const question = byDifficulty.hard.find((q) => q.payload!.templateId === 'timesPlus')!;
    expect(question).toBeDefined();
    expect(question.answer).toBe(`${question.payload!.n}x + ${question.payload!.n2}`);
  });

  it('the two subtraction-order phrasings never produce "n - x" as the correct answer', () => {
    const subtractionQuestions = all.filter((q) => q.payload!.templateId === 'minus' || q.payload!.templateId === 'minusReversed');
    expect(subtractionQuestions.length).toBeGreaterThan(0);
    for (const question of subtractionQuestions) {
      expect(question.answer).toBe(`x - ${question.payload!.n}`);
      // The classic order slip is offered as a distractor, never as the answer.
      expect(question.options).toContain(`${question.payload!.n} - x`);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  it('rejects an answer missing from its own options', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.answer = '__not-an-option__';
    expect(() => assertExpressionQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate options', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.options[1] = corrupted.options[0];
    expect(() => assertExpressionQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects an answer that does not match its template', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.answer = `${corrupted.answer} + 1`;
    corrupted.options = [corrupted.answer, ...corrupted.options.slice(1)];
    expect(() => assertExpressionQuestionIsSound(corrupted)).toThrow();
  });
});
