import { describe, expect, it } from 'vitest';
import {
  addSubQuestionSignature,
  assertAddSubChallengeIsSound,
  buildSignedAddSubChallenges,
  classifyAddSub,
  moveDirection,
  movementOf,
  SIGNED_ADD_SUB_TOTAL,
  tickValues,
} from '../signedAddSubData';
import type { AddSubChallenge } from '../../../types/signedAddSub';

const RUNS = 300;

const sessions: AddSubChallenge[][] = Array.from({ length: RUNS }, () => buildSignedAddSubChallenges());
const all: AddSubChallenge[] = sessions.flat();

describe('steps on the line — session shape', () => {
  it('always builds the advertised number of questions with unique ids', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(SIGNED_ADD_SUB_TOTAL);
      expect(new Set(session.map((c) => c.id)).size).toBe(session.length);
    }
  });

  it('never repeats the same expression inside one session', () => {
    for (const session of sessions) {
      expect(new Set(session.map(addSubQuestionSignature)).size).toBe(session.length);
    }
  });

  it('teaches addition before subtraction', () => {
    for (const session of sessions) {
      const lastAddition = session.map((c) => c.operator).lastIndexOf('+');
      const firstSubtraction = session.map((c) => c.operator).indexOf('-');
      expect(lastAddition).toBeLessThan(firstSubtraction);
    }
  });

  it('covers every combination of operator and term sign that matters', () => {
    for (const session of sessions) {
      const shapes = new Set(session.map((c) => `${c.operator}${c.term < 0 ? 'neg' : 'pos'}`));
      expect(shapes).toEqual(new Set(['+pos', '+neg', '-pos', '-neg']));
    }
  });

  it('always includes the two turn-around cases: adding and subtracting a negative', () => {
    for (const session of sessions) {
      expect(session.some((c) => c.operator === '+' && c.term < 0 && c.delta < 0)).toBe(true);
      expect(session.some((c) => c.operator === '-' && c.term < 0 && c.delta > 0)).toBe(true);
    }
  });

  it('makes the walker cross zero at least once in a session', () => {
    for (const session of sessions) {
      expect(session.some((c) => Math.sign(c.start) !== Math.sign(c.result) && c.result !== 0)).toBe(true);
    }
  });
});

describe('steps on the line — generator invariants', () => {
  it('passes its own soundness check for every generated question', () => {
    for (const challenge of all) {
      expect(() => assertAddSubChallengeIsSound(challenge)).not.toThrow();
    }
  });

  it('derives the movement from the written operation, every time', () => {
    for (const challenge of all) {
      expect(challenge.delta).toBe(movementOf(challenge.operator, challenge.term));
      expect(challenge.result).toBe(challenge.start + challenge.delta);
    }
  });

  it('keeps the start and the landing point on the drawn line', () => {
    for (const challenge of all) {
      const ticks = tickValues(challenge.min, challenge.max, challenge.step);
      expect(ticks).toContain(challenge.start);
      expect(ticks).toContain(challenge.result);
    }
  });

  it('keeps every number whole — no floating point anywhere', () => {
    for (const challenge of all) {
      for (const value of [challenge.start, challenge.term, challenge.delta, challenge.result]) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  it('never starts on zero and never moves by zero', () => {
    for (const challenge of all) {
      expect(challenge.start).not.toBe(0);
      expect(challenge.term).not.toBe(0);
      expect(challenge.result).not.toBe(challenge.start);
      expect(Math.abs(challenge.delta)).toBeGreaterThanOrEqual(2);
    }
  });

  it('makes adding a negative move left and subtracting a negative move right', () => {
    for (const challenge of all) {
      if (challenge.term >= 0) continue;
      if (challenge.operator === '+') expect(challenge.delta).toBeLessThan(0);
      if (challenge.operator === '-') expect(challenge.delta).toBeGreaterThan(0);
    }
  });

  it('always leaves the opposite-direction landing reachable on the line', () => {
    for (const challenge of all) {
      const mirrored = challenge.start - challenge.delta;
      expect(mirrored).toBeGreaterThanOrEqual(challenge.min);
      expect(mirrored).toBeLessThanOrEqual(challenge.max);
    }
  });
});

describe('steps on the line — direction helpers', () => {
  it('turns a subtraction into the opposite movement', () => {
    expect(movementOf('+', 5)).toBe(5);
    expect(movementOf('-', 5)).toBe(-5);
    expect(movementOf('+', -5)).toBe(-5);
    expect(movementOf('-', -5)).toBe(5);
  });

  it('reads a negative movement as going left', () => {
    expect(moveDirection(-3)).toBe('left');
    expect(moveDirection(3)).toBe('right');
  });
});

describe('steps on the line — wrong answers are classified', () => {
  const challenge: AddSubChallenge = {
    id: 'test',
    min: -10,
    max: 10,
    step: 1,
    start: -3,
    operator: '+',
    term: 5,
    delta: 5,
    result: 2,
  };

  it('names a move the opposite way a direction mistake', () => {
    expect(classifyAddSub(challenge, -8)).toBe('wrongDirection');
    expect(classifyAddSub(challenge, -5)).toBe('wrongDirection');
  });

  it('names the right way with the wrong count a counting slip', () => {
    expect(classifyAddSub(challenge, 1)).toBe('countSlip');
    expect(classifyAddSub(challenge, 4)).toBe('countSlip');
  });

  it('treats staying put as unclassifiable', () => {
    expect(classifyAddSub(challenge, -3)).toBe('other');
  });

  it('classifies every wrong tick of every generated question without throwing', () => {
    for (const item of all) {
      for (const value of tickValues(item.min, item.max, item.step)) {
        if (value === item.result) continue;
        expect(['wrongDirection', 'countSlip', 'other']).toContain(classifyAddSub(item, value));
      }
    }
  });
});

describe('steps on the line — the soundness check really rejects bad questions', () => {
  const base = () => structuredClone(all[0]);

  it('rejects a movement that contradicts the written operation', () => {
    const bad = base();
    bad.delta = -bad.delta;
    expect(() => assertAddSubChallengeIsSound(bad)).toThrow();
  });

  it('rejects a landing point that does not follow from the movement', () => {
    const bad = base();
    bad.result = bad.result + 1;
    expect(() => assertAddSubChallengeIsSound(bad)).toThrow();
  });

  it('rejects a landing point off the drawn line', () => {
    const bad = base();
    bad.term = 40;
    bad.delta = bad.operator === '+' ? 40 : -40;
    bad.result = bad.start + bad.delta;
    expect(() => assertAddSubChallengeIsSound(bad)).toThrow(/off the line/);
  });

  it('rejects starting on zero', () => {
    const bad = base();
    bad.start = 0;
    bad.result = bad.delta;
    expect(() => assertAddSubChallengeIsSound(bad)).toThrow(/zero/);
  });

  it('rejects a move of zero', () => {
    const bad = base();
    bad.term = 0;
    bad.delta = 0;
    bad.result = bad.start;
    expect(() => assertAddSubChallengeIsSound(bad)).toThrow();
  });
});
