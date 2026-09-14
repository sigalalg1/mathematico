import { describe, expect, it } from 'vitest';
import { buildFindThePointStages, FIND_THE_POINT_TOTAL } from '../findThePointData';
import type { FindPointChallenge } from '../../../types/findThePoint';

const RUNS = 400;

function allRounds(): FindPointChallenge[][] {
  return Array.from({ length: RUNS }, () => buildFindThePointStages().flatMap((stage) => stage.challenges));
}

describe('find the point — option sets', () => {
  const rounds = allRounds();

  it('always shows exactly four labelled options A-D', () => {
    for (const round of rounds) {
      for (const challenge of round) {
        expect(challenge.options).toHaveLength(4);
        expect(challenge.options.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
      }
    }
  });

  it('never shows two options at the same coordinate (they would overlap on the grid)', () => {
    for (const round of rounds) {
      for (const challenge of round) {
        const keys = challenge.options.map((o) => `${o.point.x},${o.point.y}`);
        expect(new Set(keys).size).toBe(4);
      }
    }
  });

  it('always includes the correct point, and correctOptionId points at it', () => {
    for (const round of rounds) {
      for (const challenge of round) {
        const correctOption = challenge.options.find((o) => o.id === challenge.correctOptionId);
        expect(correctOption).toBeDefined();
        expect(correctOption!.point).toEqual(challenge.correct);
      }
    }
  });

  it('keeps every option on integer coordinates inside the -5..5 grid', () => {
    for (const round of rounds) {
      for (const challenge of round) {
        for (const option of challenge.options) {
          expect(Number.isInteger(option.point.x)).toBe(true);
          expect(Number.isInteger(option.point.y)).toBe(true);
          expect(Math.abs(option.point.x)).toBeLessThanOrEqual(5);
          expect(Math.abs(option.point.y)).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('gives every option a unique id so clicks are unambiguous', () => {
    for (const round of rounds) {
      for (const challenge of round) {
        expect(new Set(challenge.options.map((o) => o.id)).size).toBe(4);
      }
    }
  });

  it('places the correct answer in every label position across many rounds (not always A)', () => {
    const labelsOfCorrect = new Set<string>();
    for (const round of rounds) {
      for (const challenge of round) {
        labelsOfCorrect.add(challenge.options.find((o) => o.id === challenge.correctOptionId)!.label);
      }
    }
    expect([...labelsOfCorrect].sort()).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('find the point — stage difficulty rules', () => {
  it('stage 1 only asks for quadrant I points', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildFindThePointStages().find((s) => s.id === 'stage1')!;
      expect(stage.challenges).toHaveLength(3);
      for (const challenge of stage.challenges) {
        expect(challenge.correct.x).toBeGreaterThan(0);
        expect(challenge.correct.y).toBeGreaterThan(0);
      }
    }
  });

  it('stage 2 covers all four quadrants exactly once, never an axis point', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildFindThePointStages().find((s) => s.id === 'stage2')!;
      const quadrants = stage.challenges.map(({ correct }) => {
        expect(correct.x).not.toBe(0);
        expect(correct.y).not.toBe(0);
        return correct.x > 0 ? (correct.y > 0 ? 1 : 4) : correct.y > 0 ? 2 : 3;
      });
      expect([...quadrants].sort()).toEqual([1, 2, 3, 4]);
    }
  });

  it('stage 3 only asks for axis points, never the origin, and covers both axes', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildFindThePointStages().find((s) => s.id === 'stage3')!;
      const axes = new Set<string>();
      for (const { correct } of stage.challenges) {
        expect(correct.x === 0 || correct.y === 0).toBe(true);
        expect(correct.x === 0 && correct.y === 0).toBe(false);
        axes.add(correct.y === 0 ? 'x' : 'y');
      }
      // The generator guarantees at least one of each axis in the stage.
      expect(axes.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('find the point — round structure', () => {
  it('produces the advertised total with unique challenge ids', () => {
    for (let run = 0; run < RUNS; run++) {
      const challenges = buildFindThePointStages().flatMap((s) => s.challenges);
      expect(challenges).toHaveLength(FIND_THE_POINT_TOTAL);
      expect(new Set(challenges.map((c) => c.id)).size).toBe(challenges.length);
    }
  });
});
