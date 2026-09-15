import { describe, expect, it } from 'vitest';
import {
  applyOperation,
  assertSignRuleChallengeIsSound,
  buildSignRulesChallenges,
  classifySignRule,
  familyOf,
  SIGN_RULES_MAX,
  SIGN_RULES_MIN,
  SIGN_RULES_TOTAL,
  signRuleQuestionSignature,
  tickValues,
} from '../signRulesData';
import { SIGN_RULE_FAMILIES, type SignRuleChallenge } from '../../../types/signRules';

const RUNS = 300;

const sessions: SignRuleChallenge[][] = Array.from({ length: RUNS }, () => buildSignRulesChallenges());
const all: SignRuleChallenge[] = sessions.flat();

describe('the sign rule — session shape', () => {
  it('always builds the advertised number of questions with unique ids', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(SIGN_RULES_TOTAL);
      expect(new Set(session.map((c) => c.id)).size).toBe(session.length);
    }
  });

  it('never repeats the same expression inside one session', () => {
    for (const session of sessions) {
      expect(new Set(session.map(signRuleQuestionSignature)).size).toBe(session.length);
    }
  });

  it('exercises all four sign-rule cases, so every rule can be discovered', () => {
    for (const session of sessions) {
      expect(new Set(session.map((c) => c.family))).toEqual(new Set(SIGN_RULE_FAMILIES));
    }
  });

  it('shows the pattern for the opening questions and hides it later', () => {
    for (const session of sessions) {
      const shown = session.map((c) => c.showLadder);
      expect(shown.slice(0, 3)).toEqual([true, true, true]);
      expect(shown.slice(3).some(Boolean)).toBe(false);
    }
  });

  it('discovers the negative-times-negative rule from a pattern, not from a rule statement', () => {
    for (const session of sessions) {
      const discovery = session.find((c) => c.showLadder && c.family === 'negNeg');
      expect(discovery).toBeDefined();
      expect(discovery!.ladder).toHaveLength(3);
      // The pattern walks in from the other side of zero, which is what makes
      // the positive result unavoidable.
      expect(discovery!.ladder[0].left).toBeGreaterThan(discovery!.left);
      expect(discovery!.result).toBeGreaterThan(0);
    }
  });

  it('teaches multiplication before division', () => {
    for (const session of sessions) {
      const lastMultiply = session.map((c) => c.operator).lastIndexOf('×');
      const firstDivide = session.map((c) => c.operator).indexOf(':');
      expect(firstDivide).toBeGreaterThan(-1);
      expect(lastMultiply).toBeLessThan(firstDivide);
    }
  });
});

describe('the sign rule — generator invariants', () => {
  it('passes its own soundness check for every generated question', () => {
    for (const challenge of all) {
      expect(() => assertSignRuleChallengeIsSound(challenge)).not.toThrow();
    }
  });

  it('obeys the sign rule on every single question', () => {
    for (const challenge of all) {
      expect(Math.sign(challenge.result)).toBe(Math.sign(challenge.left) * Math.sign(challenge.right));
      expect(challenge.family).toBe(familyOf(challenge.left, challenge.right));
    }
  });

  it('derives the result from the written operation', () => {
    for (const challenge of all) {
      expect(challenge.result).toBe(applyOperation(challenge.left, challenge.operator, challenge.right));
    }
  });

  it('keeps every result a whole number — divisions always come out exactly', () => {
    for (const challenge of all) {
      expect(Number.isInteger(challenge.result)).toBe(true);
      if (challenge.operator === ':') {
        expect(challenge.left).toBe(challenge.result * challenge.right);
        expect(Math.abs(challenge.right)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('never uses zero, whose sign would be meaningless here', () => {
    for (const challenge of all) {
      expect(challenge.left).not.toBe(0);
      expect(challenge.right).not.toBe(0);
      expect(challenge.result).not.toBe(0);
    }
  });

  it('keeps both the result and its sign-flipped twin clickable on the line', () => {
    for (const challenge of all) {
      const ticks = tickValues(challenge.min, challenge.max, challenge.step);
      expect(ticks).toContain(challenge.result);
      expect(ticks).toContain(-challenge.result);
      expect(challenge.min).toBe(SIGN_RULES_MIN);
      expect(challenge.max).toBe(SIGN_RULES_MAX);
    }
  });

  it('builds a real constant-step pattern that runs into the question', () => {
    for (const challenge of all) {
      if (challenge.operator === ':') {
        expect(challenge.ladder).toHaveLength(0);
        continue;
      }
      expect(challenge.ladder).toHaveLength(3);
      for (const row of challenge.ladder) {
        expect(row.right).toBe(challenge.right);
        expect(row.result).toBe(row.left * row.right);
        expect(row.left).not.toBe(challenge.left);
      }
      const results = [...challenge.ladder.map((row) => row.result), challenge.result];
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1] - results[i]).toBe(challenge.right);
      }
      const lefts = [...challenge.ladder.map((row) => row.left), challenge.left];
      for (let i = 1; i < lefts.length; i++) {
        expect(lefts[i - 1] - lefts[i]).toBe(1);
      }
    }
  });

  it('keeps pattern rows small enough to read', () => {
    for (const challenge of all) {
      for (const row of challenge.ladder) {
        expect(Math.abs(row.result)).toBeLessThanOrEqual(40);
      }
    }
  });

  it('never shows a pattern for a division', () => {
    for (const challenge of all) {
      if (challenge.operator !== ':') continue;
      expect(challenge.showLadder).toBe(false);
      expect(challenge.ladder).toHaveLength(0);
    }
  });
});

describe('the sign rule — family naming', () => {
  it('names each combination of signs', () => {
    expect(familyOf(3, 4)).toBe('posPos');
    expect(familyOf(3, -4)).toBe('posNeg');
    expect(familyOf(-3, 4)).toBe('negPos');
    expect(familyOf(-3, -4)).toBe('negNeg');
  });

  it('divides exactly the way it multiplies', () => {
    expect(applyOperation(-12, ':', 3)).toBe(-4);
    expect(applyOperation(-12, ':', -3)).toBe(4);
    expect(applyOperation(-3, '×', -4)).toBe(12);
  });
});

describe('the sign rule — wrong answers are classified', () => {
  const challenge: SignRuleChallenge = {
    id: 'test',
    min: -12,
    max: 12,
    step: 1,
    operator: '×',
    left: -2,
    right: -3,
    result: 6,
    family: 'negNeg',
    showLadder: true,
    ladder: [
      { left: 1, right: -3, result: -3 },
      { left: 0, right: -3, result: 0 },
      { left: -1, right: -3, result: 3 },
    ],
  };

  it('names the mirrored result a sign mistake, not an arithmetic one', () => {
    expect(classifySignRule(challenge, -6)).toBe('signError');
  });

  it('names anything else a problem with the numbers themselves', () => {
    expect(classifySignRule(challenge, 5)).toBe('magnitudeError');
    expect(classifySignRule(challenge, -5)).toBe('magnitudeError');
  });

  it('classifies every wrong tick of every generated question without throwing', () => {
    for (const item of all) {
      for (const value of tickValues(item.min, item.max, item.step)) {
        if (value === item.result) continue;
        expect(['signError', 'magnitudeError']).toContain(classifySignRule(item, value));
      }
    }
  });
});

describe('the sign rule — the soundness check really rejects bad questions', () => {
  const base = () => structuredClone(all.find((c) => c.operator === '×')!);

  it('rejects a result whose sign breaks the rule', () => {
    const bad = base();
    bad.result = -bad.result;
    expect(() => assertSignRuleChallengeIsSound(bad)).toThrow();
  });

  it('rejects a family label that contradicts the signs', () => {
    const bad = base();
    bad.family = bad.family === 'negNeg' ? 'posPos' : 'negNeg';
    expect(() => assertSignRuleChallengeIsSound(bad)).toThrow(/family/);
  });

  it('rejects a pattern that does not step by a constant amount', () => {
    const bad = base();
    bad.ladder[1] = { ...bad.ladder[1], result: bad.ladder[1].result + 1 };
    expect(() => assertSignRuleChallengeIsSound(bad)).toThrow();
  });

  it('rejects a pattern that does not run into the question', () => {
    const bad = base();
    bad.ladder = bad.ladder.map((row) => ({ ...row, left: row.left + 5, result: (row.left + 5) * row.right }));
    expect(() => assertSignRuleChallengeIsSound(bad)).toThrow();
  });

  it('rejects a division that does not come out exactly', () => {
    const bad = structuredClone(all.find((c) => c.operator === ':')!);
    bad.left = bad.left + 1;
    expect(() => assertSignRuleChallengeIsSound(bad)).toThrow();
  });

  it('rejects zero anywhere in the question', () => {
    const bad = base();
    bad.left = 0;
    expect(() => assertSignRuleChallengeIsSound(bad)).toThrow(/zero/);
  });
});
