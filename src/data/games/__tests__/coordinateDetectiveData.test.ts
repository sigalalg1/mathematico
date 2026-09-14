import { describe, expect, it } from 'vitest';
import { buildCoordinateDetectiveChallenges, COORDINATE_DETECTIVE_TOTAL } from '../coordinateDetectiveData';
import { classifyMistake } from '../hitTheTargetMistakes';
import type { DetectiveChallenge, MistakeCategory } from '../../../types/coordinateDetective';

const RUNS = 600;

type P = { x: number; y: number };

/** Independent definitions of each mistake the student is asked to spot. */
const MATCHES: Record<MistakeCategory, (t: P, w: P) => boolean> = {
  swappedXY: (t, w) => t.x !== t.y && w.x === t.y && w.y === t.x,
  xSignError: (t, w) => t.x !== 0 && w.x === -t.x && w.y === t.y,
  ySignError: (t, w) => t.y !== 0 && w.y === -t.y && w.x === t.x,
  axisConfusion: (t, w) =>
    (t.x === 0) !== (t.y === 0) &&
    (t.x === 0 ? w.x !== 0 && w.y === t.y : w.y !== 0 && w.x === t.x),
  zeroConfusion: (t, w) => t.x === 0 && t.y === 0 && (w.x !== 0 || w.y !== 0),
};

function allChallenges(): DetectiveChallenge[] {
  return Array.from({ length: RUNS }, () => buildCoordinateDetectiveChallenges()).flat();
}

describe('coordinate detective — every case really shows the mistake it claims', () => {
  const challenges = allChallenges();

  it('has a wrong answer that genuinely exhibits the labelled mistake', () => {
    for (const challenge of challenges) {
      expect(MATCHES[challenge.category](challenge.target, challenge.wrongAnswer)).toBe(true);
    }
  });

  it('never has a "wrong" answer that is actually correct', () => {
    for (const { target, wrongAnswer } of challenges) {
      expect(`${wrongAnswer.x},${wrongAnswer.y}`).not.toBe(`${target.x},${target.y}`);
    }
  });

  it('is never ambiguous: exactly one of the offered options fits the evidence', () => {
    for (const challenge of challenges) {
      const fitting = challenge.options.filter((option) =>
        MATCHES[option](challenge.target, challenge.wrongAnswer),
      );
      expect(fitting).toEqual([challenge.category]);
    }
  });

  it('keeps both points on integer coordinates inside the -5..5 grid', () => {
    for (const { target, wrongAnswer } of challenges) {
      for (const point of [target, wrongAnswer]) {
        expect(Number.isInteger(point.x)).toBe(true);
        expect(Number.isInteger(point.y)).toBe(true);
        expect(Math.abs(point.x)).toBeLessThanOrEqual(5);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(5);
      }
    }
  });

  it('agrees with the shared classifyMistake helper for the sign and swap cases', () => {
    for (const { target, wrongAnswer, category } of challenges) {
      if (category === 'swappedXY') expect(classifyMistake(target, wrongAnswer)).toBe('swapped');
      if (category === 'xSignError') expect(classifyMistake(target, wrongAnswer)).toBe('xSign');
      if (category === 'ySignError') expect(classifyMistake(target, wrongAnswer)).toBe('ySign');
    }
  });
});

describe('coordinate detective — answer options', () => {
  it('always offers three distinct options including the correct one', () => {
    for (const challenge of allChallenges()) {
      expect(challenge.options).toHaveLength(3);
      expect(new Set(challenge.options).size).toBe(3);
      expect(challenge.options).toContain(challenge.category);
    }
  });

  it('shows the correct option in every position across many rounds', () => {
    const positions = new Set<number>();
    for (const challenge of allChallenges()) {
      positions.add(challenge.options.indexOf(challenge.category));
    }
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });
});

describe('coordinate detective — round structure', () => {
  it('produces the advertised number of unique challenges covering every category', () => {
    const seen = new Set<MistakeCategory>();
    for (let run = 0; run < RUNS; run++) {
      const round = buildCoordinateDetectiveChallenges();
      expect(round).toHaveLength(COORDINATE_DETECTIVE_TOTAL);
      expect(new Set(round.map((c) => c.id)).size).toBe(round.length);
      round.forEach((c) => seen.add(c.category));
    }
    expect([...seen].sort()).toEqual(['axisConfusion', 'swappedXY', 'xSignError', 'ySignError', 'zeroConfusion']);
  });
});
