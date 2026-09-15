import { describe, expect, it } from 'vitest';
import {
  ABSOLUTE_VALUE_MAX,
  ABSOLUTE_VALUE_MIN,
  ABSOLUTE_VALUE_TOTAL,
  absoluteQuestionSignature,
  assertAbsoluteChallengeIsSound,
  buildAbsoluteValueChallenges,
  classifyAbsolute,
  expectedAbsoluteAnswer,
  tickValues,
} from '../absoluteValueData';
import type { AbsoluteChallenge } from '../../../types/absoluteValue';

const RUNS = 300;

const sessions: AbsoluteChallenge[][] = Array.from({ length: RUNS }, () => buildAbsoluteValueChallenges());
const all: AbsoluteChallenge[] = sessions.flat();

describe('distance from zero — session shape', () => {
  it('always builds the advertised number of questions with unique ids', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(ABSOLUTE_VALUE_TOTAL);
      expect(new Set(session.map((c) => c.id)).size).toBe(session.length);
    }
  });

  it('never repeats the same question inside one session', () => {
    for (const session of sessions) {
      expect(new Set(session.map(absoluteQuestionSignature)).size).toBe(session.length);
    }
  });

  it('covers all three ways of asking about distance', () => {
    for (const session of sessions) {
      expect(new Set(session.map((c) => c.kind))).toEqual(
        new Set(['evaluate', 'findFromDistance', 'distanceBetween']),
      );
    }
  });

  it('reads an absolute value before working backwards from one', () => {
    for (const session of sessions) {
      const firstEvaluate = session.findIndex((c) => c.kind === 'evaluate');
      const firstBackwards = session.findIndex((c) => c.kind === 'findFromDistance');
      const firstBetween = session.findIndex((c) => c.kind === 'distanceBetween');
      expect(firstEvaluate).toBeLessThan(firstBackwards);
      expect(firstBackwards).toBeLessThan(firstBetween);
    }
  });

  it('asks about a negative number first — that is where the idea bites', () => {
    for (const session of sessions) {
      expect(session[0].kind).toBe('evaluate');
      expect(session[0].subject).toBeLessThan(0);
    }
  });

  it('asks about both sides of zero when working backwards from a distance', () => {
    for (const session of sessions) {
      const sides = session.filter((c) => c.kind === 'findFromDistance').map((c) => c.side);
      expect(new Set(sides)).toEqual(new Set(['negative', 'positive']));
    }
  });

  it('measures pairs on the same side of zero and pairs straddling it', () => {
    for (const session of sessions) {
      const pairs = session.filter((c) => c.kind === 'distanceBetween');
      expect(pairs.some((c) => c.subject < 0 && (c.partner ?? 0) > 0)).toBe(true);
      expect(pairs.some((c) => c.subject > 0 || (c.partner ?? 0) < 0)).toBe(true);
    }
  });
});

describe('distance from zero — generator invariants', () => {
  it('passes its own soundness check for every generated question', () => {
    for (const challenge of all) {
      expect(() => assertAbsoluteChallengeIsSound(challenge)).not.toThrow();
    }
  });

  it('always derives the stored answer from the question itself', () => {
    for (const challenge of all) {
      expect(challenge.answer).toBe(expectedAbsoluteAnswer(challenge));
    }
  });

  it('keeps the answer clickable: a whole number on a tick inside the drawn line', () => {
    for (const challenge of all) {
      expect(Number.isInteger(challenge.answer)).toBe(true);
      expect(tickValues(challenge.min, challenge.max, challenge.step)).toContain(challenge.answer);
      expect(challenge.min).toBe(ABSOLUTE_VALUE_MIN);
      expect(challenge.max).toBe(ABSOLUTE_VALUE_MAX);
    }
  });

  it('never asks for the absolute value of zero, and never answers one with a negative', () => {
    for (const challenge of all) {
      if (challenge.kind !== 'evaluate') continue;
      expect(challenge.subject).not.toBe(0);
      expect(challenge.answer).toBeGreaterThan(0);
      expect(challenge.answer).toBe(Math.abs(challenge.subject));
    }
  });

  it('draws the asked number for an evaluate question, and nothing for a backwards one', () => {
    for (const challenge of all) {
      if (challenge.kind === 'evaluate') {
        expect(challenge.plotted).toHaveLength(1);
        expect(challenge.plotted[0].value).toBe(challenge.subject);
      }
      if (challenge.kind === 'findFromDistance') {
        expect(challenge.plotted).toHaveLength(0);
      }
    }
  });

  it('makes a backwards question uniquely answerable by naming a side of zero', () => {
    for (const challenge of all) {
      if (challenge.kind !== 'findFromDistance') continue;
      expect(['negative', 'positive']).toContain(challenge.side);
      expect(challenge.distance).toBeGreaterThan(0);
      expect(Math.abs(challenge.answer)).toBe(challenge.distance);
      expect(challenge.answer < 0).toBe(challenge.side === 'negative');
    }
  });

  it('measures a real, countable, on-line gap between two distinct drawn points', () => {
    for (const challenge of all) {
      if (challenge.kind !== 'distanceBetween') continue;
      expect(challenge.partner).not.toBeNull();
      expect(challenge.subject).toBeLessThan(challenge.partner!);
      expect(challenge.answer).toBe(challenge.partner! - challenge.subject);
      expect(challenge.answer).toBeGreaterThanOrEqual(2);
      expect(challenge.answer).toBeLessThanOrEqual(ABSOLUTE_VALUE_MAX);
      expect(challenge.plotted.map((p) => p.value)).toEqual([challenge.subject, challenge.partner]);
    }
  });

  it('never draws two points on the same spot', () => {
    for (const challenge of all) {
      const values = challenge.plotted.map((p) => p.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

describe('distance from zero — wrong answers are classified', () => {
  const evaluate: AbsoluteChallenge = {
    id: 'test',
    kind: 'evaluate',
    min: -10,
    max: 10,
    step: 1,
    subject: -6,
    partner: null,
    distance: 6,
    side: null,
    answer: 6,
    plotted: [{ id: 'p', value: -6, label: '-6' }],
  };

  const backwards: AbsoluteChallenge = {
    ...evaluate,
    id: 'test2',
    kind: 'findFromDistance',
    subject: -4,
    distance: 4,
    side: 'negative',
    answer: -4,
    plotted: [],
  };

  it('calls a negative absolute value exactly that', () => {
    expect(classifyAbsolute(evaluate, -6)).toBe('negatedAnswer');
  });

  it('calls the mirror answer of a backwards question a wrong-side slip', () => {
    expect(classifyAbsolute(backwards, 4)).toBe('wrongSide');
  });

  it('treats a near miss as a counting slip', () => {
    expect(classifyAbsolute(evaluate, 5)).toBe('offByGap');
    expect(classifyAbsolute(evaluate, 8)).toBe('offByGap');
  });

  it('falls back to a general explanation for anything else', () => {
    expect(classifyAbsolute(evaluate, 1)).toBe('other');
  });

  it('classifies every wrong tick of every generated question without throwing', () => {
    for (const challenge of all) {
      for (const value of tickValues(challenge.min, challenge.max, challenge.step)) {
        if (value === challenge.answer) continue;
        expect(['negatedAnswer', 'wrongSide', 'offByGap', 'other']).toContain(classifyAbsolute(challenge, value));
      }
    }
  });
});

describe('distance from zero — the soundness check really rejects bad questions', () => {
  const base = () => structuredClone(all.find((c) => c.kind === 'evaluate')!);

  it('rejects a negative absolute value', () => {
    const bad = base();
    bad.answer = -bad.answer;
    expect(() => assertAbsoluteChallengeIsSound(bad)).toThrow();
  });

  it('rejects an answer that does not match the question', () => {
    const bad = base();
    bad.answer = bad.answer + 1;
    expect(() => assertAbsoluteChallengeIsSound(bad)).toThrow(/does not match/);
  });

  it('rejects a backwards question with no side named — it would have two answers', () => {
    const bad = structuredClone(all.find((c) => c.kind === 'findFromDistance')!);
    bad.side = null;
    expect(() => assertAbsoluteChallengeIsSound(bad)).toThrow();
    // ...and equally when the side contradicts the answer it stores.
    const flipped = structuredClone(all.find((c) => c.kind === 'findFromDistance')!);
    flipped.side = flipped.side === 'negative' ? 'positive' : 'negative';
    expect(() => assertAbsoluteChallengeIsSound(flipped)).toThrow();
  });

  it('rejects a backwards question that already draws the answer', () => {
    const bad = structuredClone(all.find((c) => c.kind === 'findFromDistance')!);
    bad.plotted = [{ id: 'x', value: bad.answer, label: 'A' }];
    expect(() => assertAbsoluteChallengeIsSound(bad)).toThrow(/give the point away/);
  });

  it('rejects a gap question whose points are the wrong way round', () => {
    const bad = structuredClone(all.find((c) => c.kind === 'distanceBetween')!);
    const { subject, partner } = bad;
    bad.subject = partner!;
    bad.partner = subject;
    expect(() => assertAbsoluteChallengeIsSound(bad)).toThrow();
  });

  it('rejects an answer that cannot be clicked on the drawn line', () => {
    const bad = base();
    bad.subject = -20;
    bad.answer = 20;
    expect(() => assertAbsoluteChallengeIsSound(bad)).toThrow(/cannot be clicked/);
  });
});
