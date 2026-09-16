import { describe, expect, it } from 'vitest';
import {
  MULTIPLICATION_TABLES_CHOICES,
  buildMultiplicationTablesQuestions,
  multiplicationTablesActivity,
  multiplicationTablesPool,
} from '../multiplicationTablesData';

const EARLY = [2, 3, 4, 5, 10];
const LATE = [6, 7, 8, 9];

function factsOf(prompt: string): [number, number] {
  const [left, right] = prompt.split(' × ').map(Number);
  return [left, right];
}

describe('multiplication tables — difficulty definitions', () => {
  it('keeps the basic level inside the tables met first', () => {
    for (const fact of multiplicationTablesPool('basic')) {
      expect(EARLY).toContain(fact.left);
      expect(EARLY).toContain(fact.right);
    }
  });

  it('pairs one later table with an easier one at the intermediate level', () => {
    const pool = multiplicationTablesPool('intermediate');
    for (const fact of pool) {
      const factors = [fact.left, fact.right];
      expect(factors.filter((factor) => LATE.includes(factor))).toHaveLength(1);
      expect(factors.filter((factor) => EARLY.includes(factor))).toHaveLength(1);
    }
    // Both orientations are offered: 7 × 4 and 4 × 7 are different recall prompts.
    expect(pool.some((fact) => fact.left === 7 && fact.right === 4)).toBe(true);
    expect(pool.some((fact) => fact.left === 4 && fact.right === 7)).toBe(true);
  });

  it('confines the hard level to the later tables against each other', () => {
    const pool = multiplicationTablesPool('hard');
    for (const fact of pool) {
      expect(LATE).toContain(fact.left);
      expect(LATE).toContain(fact.right);
    }
    expect(pool.some((fact) => fact.left === 7 && fact.right === 8)).toBe(true);
  });

  it('gives every level a genuinely different set of facts', () => {
    const asKeys = (difficulty: string) =>
      new Set(multiplicationTablesPool(difficulty).map((fact) => `${fact.left}x${fact.right}`));
    const basic = asKeys('basic');
    const intermediate = asKeys('intermediate');
    const hard = asKeys('hard');

    for (const key of intermediate) expect(basic.has(key)).toBe(false);
    for (const key of hard) expect(basic.has(key)).toBe(false);
    for (const key of hard) expect(intermediate.has(key)).toBe(false);
  });

  it('falls back to the basic pool for an unknown difficulty', () => {
    expect(multiplicationTablesPool('nonsense')).toEqual(multiplicationTablesPool('basic'));
    expect(multiplicationTablesPool(null)).toEqual(multiplicationTablesPool('basic'));
  });
});

describe('multiplication tables — generated questions', () => {
  it.each([5, 10, 20, 50])('builds exactly %i questions, even past the pool size', (count) => {
    for (const difficulty of ['basic', 'intermediate', 'hard']) {
      const questions = buildMultiplicationTablesQuestions({ difficultyId: difficulty, count });
      expect(questions).toHaveLength(count);
      expect(new Set(questions.map((question) => question.id)).size).toBe(count);
    }
  });

  it('never asks the same fact twice in a row', () => {
    for (let run = 0; run < 50; run += 1) {
      const questions = buildMultiplicationTablesQuestions({ difficultyId: 'hard', count: 50 });
      for (let i = 1; i < questions.length; i += 1) {
        expect(questions[i].prompt).not.toBe(questions[i - 1].prompt);
      }
    }
  });

  it('offers four distinct choices with exactly one correct product', () => {
    const questions = buildMultiplicationTablesQuestions({ difficultyId: 'intermediate', count: 50 });
    for (const question of questions) {
      const [left, right] = factsOf(question.prompt);
      expect(question.answer).toBe(String(left * right));
      expect(question.options).toHaveLength(MULTIPLICATION_TABLES_CHOICES);
      expect(new Set(question.options).size).toBe(MULTIPLICATION_TABLES_CHOICES);
      expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
      for (const option of question.options) expect(Number(option)).toBeGreaterThan(0);
    }
  });
});

describe('multiplication tables — declared capabilities', () => {
  it('offers 5/10/20/50 for practice but only the longer runs for a challenge', () => {
    const { capabilities } = multiplicationTablesActivity;
    expect(capabilities.questionCounts).toEqual([5, 10, 20, 50]);
    expect(capabilities.challengeQuestionCounts).toEqual([20, 50]);
    expect(capabilities.supportsChallenge).toBe(true);
  });

  it('requires a flawless run before a speed record counts', () => {
    expect(multiplicationTablesActivity.capabilities.paceRecordMinAccuracy).toBe(1);
  });
});
