import { describe, expect, it } from 'vitest';
import {
  assertCompareChallengeIsSound,
  buildCompareSignedChallenges,
  classifyCompare,
  COMPARE_SIGNED_TOTAL,
  compareQuestionSignature,
  expectedAnswer,
  hasAbsoluteTrap,
} from '../compareSignedData';
import type { CompareChallenge } from '../../../types/compareSigned';

const RUNS = 300;

const sessions: CompareChallenge[][] = Array.from({ length: RUNS }, () => buildCompareSignedChallenges());
const all: CompareChallenge[] = sessions.flat();

describe('which is greater — session shape', () => {
  it('always builds the advertised number of questions with unique ids', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(COMPARE_SIGNED_TOTAL);
      expect(new Set(session.map((c) => c.id)).size).toBe(session.length);
    }
  });

  it('never repeats the same comparison inside one session', () => {
    for (const session of sessions) {
      expect(new Set(session.map(compareQuestionSignature)).size).toBe(session.length);
    }
  });

  it('asks for both the greatest and the smallest across a session', () => {
    for (const session of sessions) {
      expect(new Set(session.map((c) => c.goal))).toEqual(new Set(['greatest', 'smallest']));
    }
  });

  it('starts with a two-number comparison and works up to three', () => {
    for (const session of sessions) {
      expect(session[0].candidates).toHaveLength(2);
      expect(session[session.length - 1].candidates).toHaveLength(3);
    }
  });

  it('includes an all-negative comparison, the hardest case to read', () => {
    for (const session of sessions) {
      expect(session.some((c) => c.candidates.every((candidate) => candidate.value < 0))).toBe(true);
    }
  });

  it('includes a pair only a few apart, where careless reading really bites', () => {
    for (const session of sessions) {
      const tight = session.filter((c) => c.candidates.length === 2);
      const spreads = tight.map((c) => Math.abs(c.candidates[0].value - c.candidates[1].value));
      expect(Math.min(...spreads)).toBeLessThanOrEqual(3);
    }
  });
});

describe('which is greater — generator invariants', () => {
  it('passes its own soundness check for every generated question', () => {
    for (const challenge of all) {
      expect(() => assertCompareChallengeIsSound(challenge)).not.toThrow();
    }
  });

  it('keeps every candidate a distinct non-zero whole number on a tick inside the line', () => {
    for (const challenge of all) {
      const values = challenge.candidates.map((c) => c.value);
      expect(new Set(values).size).toBe(values.length);
      for (const value of values) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).not.toBe(0);
        expect(value).toBeGreaterThanOrEqual(challenge.min);
        expect(value).toBeLessThanOrEqual(challenge.max);
        expect(Math.abs(value % challenge.step)).toBe(0);
      }
    }
  });

  it('stores the true extreme as the answer, and it is unique', () => {
    for (const challenge of all) {
      const values = challenge.candidates.map((c) => c.value);
      expect(challenge.answer).toBe(expectedAnswer(values, challenge.goal));
      expect(values.filter((value) => value === challenge.answer)).toHaveLength(1);
      const correct = challenge.candidates.find((c) => c.id === challenge.correctCandidateId)!;
      expect(correct.value).toBe(challenge.answer);
    }
  });

  it('always includes at least one negative number', () => {
    for (const challenge of all) {
      expect(challenge.candidates.some((c) => c.value < 0)).toBe(true);
    }
  });

  it('never lets the digits alone give the answer — the misconception is always live', () => {
    for (const challenge of all) {
      expect(hasAbsoluteTrap(challenge.candidates.map((c) => c.value), challenge.goal)).toBe(true);
    }
  });

  it('lists candidates left to right so the drawing order matches the line', () => {
    for (const challenge of all) {
      const values = challenge.candidates.map((c) => c.value);
      expect(values).toEqual([...values].sort((a, b) => a - b));
    }
  });
});

describe('which is greater — the trap helper', () => {
  it('spots that -7 looks bigger than -3 but is not', () => {
    expect(hasAbsoluteTrap([-3, -7], 'greatest')).toBe(true);
    expect(expectedAnswer([-3, -7], 'greatest')).toBe(-3);
  });

  it('spots that 3 looks smaller than -8 but is not', () => {
    expect(hasAbsoluteTrap([-8, 3], 'smallest')).toBe(true);
    expect(expectedAnswer([-8, 3], 'smallest')).toBe(-8);
  });

  it('treats any pair of negatives as a trap — the digits always read backwards there', () => {
    expect(hasAbsoluteTrap([-5, -2], 'smallest')).toBe(true);
    expect(hasAbsoluteTrap([-5, -2], 'greatest')).toBe(true);
  });

  it('reports no trap when the digits already agree with the order', () => {
    expect(hasAbsoluteTrap([2, 5], 'greatest')).toBe(false);
    expect(hasAbsoluteTrap([2, 5], 'smallest')).toBe(false);
  });
});

describe('which is greater — wrong answers are classified', () => {
  const bothNegative: CompareChallenge = {
    id: 'test',
    min: -10,
    max: 10,
    step: 1,
    goal: 'greatest',
    candidates: [
      { id: 'a', value: -7 },
      { id: 'b', value: -3 },
    ],
    answer: -3,
    correctCandidateId: 'b',
  };

  const mixed: CompareChallenge = {
    id: 'test2',
    min: -10,
    max: 10,
    step: 1,
    goal: 'greatest',
    candidates: [
      { id: 'a', value: -8 },
      { id: 'b', value: 3 },
    ],
    answer: 3,
    correctCandidateId: 'b',
  };

  it('names picking the number furthest from zero an absolute-value confusion', () => {
    expect(classifyCompare(bothNegative, -7)).toBe('absoluteConfusion');
  });

  it('names picking a negative over a positive a sign confusion', () => {
    expect(classifyCompare(mixed, -8)).toBe('signConfusion');
  });

  it('still names the sign confusion when a middle negative is picked over a positive', () => {
    const three: CompareChallenge = {
      ...bothNegative,
      candidates: [
        { id: 'a', value: -7 },
        { id: 'b', value: -3 },
        { id: 'c', value: 5 },
      ],
      answer: 5,
      correctCandidateId: 'c',
    };
    expect(classifyCompare(three, -3)).toBe('signConfusion');
    expect(classifyCompare({ ...three, goal: 'smallest', answer: -7, correctCandidateId: 'a' }, -3)).toBe('absoluteConfusion');
  });

  it('falls back to a general nudge when neither misconception explains the pick', () => {
    const sameSide: CompareChallenge = {
      ...bothNegative,
      candidates: [
        { id: 'a', value: -3 },
        { id: 'b', value: 5 },
        { id: 'c', value: 8 },
      ],
      answer: 8,
      correctCandidateId: 'c',
    };
    expect(classifyCompare(sameSide, 5)).toBe('other');
  });

  it('classifies every wrong candidate of every generated question without throwing', () => {
    for (const challenge of all) {
      for (const candidate of challenge.candidates) {
        if (candidate.value === challenge.answer) continue;
        expect(['absoluteConfusion', 'signConfusion', 'other']).toContain(classifyCompare(challenge, candidate.value));
      }
    }
  });
});

describe('which is greater — the soundness check really rejects bad questions', () => {
  const base = () => structuredClone(all[0]);

  it('rejects a question whose answer is not the extreme value', () => {
    const bad = base();
    bad.answer = bad.candidates.find((c) => c.value !== bad.answer)!.value;
    expect(() => assertCompareChallengeIsSound(bad)).toThrow(/extreme value/);
  });

  it('rejects a comparison the digits alone would solve', () => {
    const bad = base();
    bad.goal = 'greatest';
    bad.candidates = [
      { id: 'a', value: -2 },
      { id: 'b', value: 6 },
    ];
    bad.answer = 6;
    bad.correctCandidateId = 'b';
    expect(() => assertCompareChallengeIsSound(bad)).toThrow(/digits alone/);
  });

  it('rejects an all-positive comparison, which teaches nothing here', () => {
    const bad = base();
    bad.candidates = [
      { id: 'a', value: 2 },
      { id: 'b', value: 6 },
    ];
    bad.answer = 6;
    bad.correctCandidateId = 'b';
    expect(() => assertCompareChallengeIsSound(bad)).toThrow();
  });

  it('rejects two candidates sharing a value', () => {
    const bad = base();
    bad.candidates = [
      { id: 'a', value: -4 },
      { id: 'b', value: -4 },
    ];
    expect(() => assertCompareChallengeIsSound(bad)).toThrow(/share a value/);
  });

  it('rejects zero as a candidate', () => {
    const bad = base();
    bad.candidates = [
      { id: 'a', value: -4 },
      { id: 'b', value: 0 },
    ];
    bad.answer = 0;
    bad.correctCandidateId = 'b';
    expect(() => assertCompareChallengeIsSound(bad)).toThrow(/zero/);
  });
});
