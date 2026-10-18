import { describe, expect, it } from 'vitest';
import { assertPatternChallengeIsSound, buildPatternChallenges, PATTERNS_TOTAL, type PatternChallenge } from '../algebraPatternsData';
import { seededRandom } from '../../../utils/random';

const RUNS = 300;
const sessions = Array.from({ length: RUNS }, (_, index) => buildPatternChallenges(seededRandom(1000 + index)));
const all = sessions.flat();

describe('session shape', () => {
  it('always builds the full fixed progression', () => {
    for (const session of sessions) expect(session).toHaveLength(PATTERNS_TOTAL);
  });

  it('question ids are unique within a session, in the authored order', () => {
    for (const session of sessions) {
      expect(session.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']);
    }
  });

  it('every question kind from the spec appears across the progression', () => {
    for (const session of sessions) {
      const kinds = new Set(session.map((q) => q.kind));
      expect(kinds).toEqual(new Set(['computeOutput', 'computeRule', 'computeInput', 'visualStage']));
    }
  });
});

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const challenge of all) expect(() => assertPatternChallengeIsSound(challenge)).not.toThrow();
  });

  it('always offers exactly four options, with no duplicates', () => {
    for (const challenge of all) {
      expect(challenge.options).toHaveLength(4);
      expect(new Set(challenge.options).size).toBe(4);
    }
  });

  it('the answer is always among the options', () => {
    for (const challenge of all) expect(challenge.options).toContain(challenge.answer);
  });

  it('never generates a coefficient of 0 (a rule with no x in it)', () => {
    for (const challenge of all) expect(challenge.expr.coefficient).not.toBe(0);
  });

  it('every worked example genuinely matches the rule it is demonstrating', () => {
    for (const challenge of all) {
      for (const pair of challenge.knownPairs) {
        expect(challenge.expr.coefficient * pair.input + challenge.expr.constant).toBe(pair.output);
      }
    }
  });

  it('computeInput questions always have an exact (non-fractional) recoverable input', () => {
    const computeInputQuestions = all.filter((q) => q.kind === 'computeInput');
    expect(computeInputQuestions.length).toBeGreaterThan(0);
    for (const challenge of computeInputQuestions) {
      expect(Number.isInteger(Number(challenge.answer))).toBe(true);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  function pick(kind: PatternChallenge['kind']): PatternChallenge {
    const found = all.find((q) => q.kind === kind);
    if (!found) throw new Error(`no ${kind} question generated across ${RUNS} runs`);
    return found;
  }

  it('rejects a coefficient of 0', () => {
    const corrupted = structuredClone(pick('computeOutput'));
    corrupted.expr.coefficient = 0;
    expect(() => assertPatternChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects an answer missing from its own options', () => {
    const corrupted = structuredClone(pick('computeOutput'));
    corrupted.answer = '__not-an-option__';
    expect(() => assertPatternChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate options', () => {
    const corrupted = structuredClone(pick('computeRule'));
    corrupted.options[1] = corrupted.options[0];
    expect(() => assertPatternChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects a worked example that does not match the rule', () => {
    const corrupted = structuredClone(pick('computeOutput'));
    corrupted.knownPairs[0] = { ...corrupted.knownPairs[0], output: corrupted.knownPairs[0].output + 1 };
    expect(() => assertPatternChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects a computeRule answer that does not match the rule', () => {
    const corrupted = structuredClone(pick('computeRule'));
    corrupted.answer = `${corrupted.answer} + 1`;
    expect(() => assertPatternChallengeIsSound(corrupted)).toThrow();
  });
});
