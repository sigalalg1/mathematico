import { describe, expect, it } from 'vitest';
import {
  applyOperation,
  assertSignRuleQuestionIsSound,
  buildSignRulesQuestionsForSeed,
  classifySignRule,
  expressionSteps,
  familyOf,
  signRulesActivity,
} from '../signRulesData';
import type { SignRuleQuestionPayload } from '../../../types/signRules';

const DIFFICULTIES = ['basic', 'intermediate', 'hard'] as const;
const sessions = DIFFICULTIES.flatMap((difficultyId) =>
  Array.from({ length: 150 }, (_, seed) =>
    buildSignRulesQuestionsForSeed({ difficultyId, count: 20 }, seed),
  ),
);
const all = sessions.flat();

describe('signed multiplication and division — core mathematics', () => {
  it('covers all multiplication sign combinations', () => {
    expect(applyOperation(3, '×', 4)).toBe(12);
    expect(applyOperation(-3, '×', 4)).toBe(-12);
    expect(applyOperation(3, '×', -4)).toBe(-12);
    expect(applyOperation(-3, '×', -4)).toBe(12);
    expect(applyOperation(0, '×', -9)).toBe(0);
  });

  it('covers all division sign combinations and zero dividend', () => {
    expect(applyOperation(24, '÷', 6)).toBe(4);
    expect(applyOperation(-24, '÷', 6)).toBe(-4);
    expect(applyOperation(24, '÷', -6)).toBe(-4);
    expect(applyOperation(-24, '÷', -6)).toBe(4);
    expect(applyOperation(0, '÷', -6)).toBe(0);
  });

  it('rejects division by zero', () => {
    expect(() => applyOperation(5, '÷', 0)).toThrow(/divisor/);
  });

  it('names all four sign families', () => {
    expect(familyOf(3, 4)).toBe('posPos');
    expect(familyOf(-3, 4)).toBe('negPos');
    expect(familyOf(3, -4)).toBe('posNeg');
    expect(familyOf(-3, -4)).toBe('negNeg');
  });
});

describe('signed multiplication and division — generated invariants', () => {
  it('passes the soundness assertion across many seeds', () => {
    for (const question of all) {
      expect(() => assertSignRuleQuestionIsSound(question)).not.toThrow();
    }
  });

  it('never divides by zero and always has an integer quotient', () => {
    for (const question of all) {
      const payload = question.payload!;
      if (payload.operator !== '÷') continue;
      expect(payload.right).not.toBe(0);
      expect(Number.isInteger(payload.left / payload.right)).toBe(true);
    }
  });

  it('provides unique choices with exactly one correct answer', () => {
    for (const question of all) {
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
    }
  });

  it('makes sign-only answers mathematically correct', () => {
    for (const question of all) {
      const payload = question.payload!;
      if (payload.type !== 'signOnly' && payload.type !== 'signFirst') continue;
      expect(question.answer).toBe(payload.result > 0 ? 'positive' : 'negative');
    }
  });

  it('deliberately includes zero without ever creating zero divisors', () => {
    for (const session of sessions) {
      expect(session.some((question) => question.payload!.result === 0)).toBe(true);
      expect(session.every((question) => question.payload!.right !== 0)).toBe(true);
    }
  });

  it('includes every sign family in each normal-length session', () => {
    for (const session of sessions) {
      const families = new Set(session.map((question) => question.payload!.family));
      for (const family of ['posPos', 'negPos', 'posNeg', 'negNeg']) expect(families).toContain(family);
    }
  });

  it('evaluates short expressions operation-first and exposes both steps', () => {
    const expressions = all.filter((question) => question.payload!.type === 'expression');
    expect(expressions.length).toBeGreaterThan(0);
    for (const question of expressions) {
      const payload = question.payload!;
      expect(payload.intermediate).toBe(applyOperation(payload.left, payload.operator, payload.right));
      expect(payload.result).toBe(payload.intermediate! + payload.addend!);
      expect(expressionSteps(payload)).toHaveLength(2);
    }
  });
});

describe('signed multiplication and division — conceptual difficulty', () => {
  it('keeps basic on multiplication, familiar facts, sign-first scaffolding, and zero', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const questions = buildSignRulesQuestionsForSeed({ difficultyId: 'basic', count: 10 }, seed);
      expect(questions.slice(0, 2).every((question) => question.payload!.type === 'signFirst')).toBe(true);
      expect(questions.every((question) => question.payload!.operator === '×')).toBe(true);
      expect(questions.every((question) => Math.abs(question.payload!.right) <= 9)).toBe(true);
      expect(questions.some((question) => question.payload!.result === 0)).toBe(true);
    }
  });

  it('adds exact division, inverse prompts, mixed work, and less scaffolding at intermediate', () => {
    const questions = buildSignRulesQuestionsForSeed({ difficultyId: 'intermediate', count: 20 }, 81);
    expect(questions.some((question) => question.payload!.type === 'inverseDivision')).toBe(true);
    expect(questions.some((question) => question.payload!.type === 'divide')).toBe(true);
    expect(questions.some((question) => question.payload!.type === 'mixed')).toBe(true);
    expect(questions.every((question) => Number.isInteger(question.payload!.result))).toBe(true);
  });

  it('adds larger sign-only items and two-step expressions at hard', () => {
    const questions = buildSignRulesQuestionsForSeed({ difficultyId: 'hard', count: 20 }, 94);
    expect(questions.some((question) => question.payload!.type === 'expression')).toBe(true);
    expect(
      questions
        .filter((question) => question.payload!.type === 'signOnly')
        .every((question) => Math.abs(question.payload!.left) >= 11),
    ).toBe(true);
  });
});

describe('signed multiplication and division — feedback and training contract', () => {
  const payload: SignRuleQuestionPayload = {
    type: 'multiply',
    difficulty: 'basic',
    left: -3,
    right: -4,
    operator: '×',
    result: 12,
    family: 'negNeg',
  };

  it('distinguishes a right magnitude with wrong sign from a calculation error', () => {
    expect(classifySignRule(payload, '-12')).toBe('signError');
    expect(classifySignRule(payload, '11')).toBe('magnitudeError');
  });

  it('offers established counts, three difficulties, and long personal challenges', () => {
    const { capabilities } = signRulesActivity;
    expect(capabilities.questionCounts).toEqual([5, 10, 20, 50]);
    expect(capabilities.difficulties.map((difficulty) => difficulty.id)).toEqual([...DIFFICULTIES]);
    expect(capabilities.supportsChallenge).toBe(true);
    expect(capabilities.challengeQuestionCounts).toEqual([20, 50]);
    expect(capabilities.paceRecordMinAccuracy).toBe(1);
  });

  it.each(DIFFICULTIES)('builds every configured count at %s', (difficultyId) => {
    for (const count of signRulesActivity.capabilities.questionCounts) {
      const questions = buildSignRulesQuestionsForSeed({ difficultyId, count }, count * 17);
      expect(questions).toHaveLength(count);
      expect(new Set(questions.map((question) => question.id)).size).toBe(count);
    }
  });
});
