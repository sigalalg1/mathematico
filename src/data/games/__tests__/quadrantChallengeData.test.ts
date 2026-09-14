import { describe, expect, it } from 'vitest';
import { buildQuadrantChallengeStages, quadrantSigns, QUADRANT_CHALLENGE_TOTAL } from '../quadrantChallengeData';
import type { QuadrantChallenge, QuadrantId } from '../../../types/quadrantChallenge';

const RUNS = 400;

/** The canonical definition the whole unit is taught from. */
function quadrantOf(x: number, y: number): QuadrantId | 'axis' {
  if (x === 0 || y === 0) return 'axis';
  if (x > 0 && y > 0) return 1;
  if (x < 0 && y > 0) return 2;
  if (x < 0 && y < 0) return 3;
  return 4;
}

function allChallenges(): QuadrantChallenge[][] {
  return Array.from({ length: RUNS }, () => buildQuadrantChallengeStages().flatMap((stage) => stage.challenges));
}

describe('quadrant challenge — sign rules', () => {
  it('uses the standard quadrant sign table', () => {
    expect(quadrantSigns).toEqual({
      1: { x: '+', y: '+' },
      2: { x: '-', y: '+' },
      3: { x: '-', y: '-' },
      4: { x: '+', y: '-' },
    });
  });

  it('every generated point really lies in the quadrant it is labelled with', () => {
    for (const round of allChallenges()) {
      for (const challenge of round) {
        const point = challenge.point ?? challenge.pair;
        if (!point || typeof challenge.correctLocation !== 'number') continue;
        // Stage 3 shows signs rather than a real point; its pair is a ±1 sign token,
        // which still has to sit in the right quadrant.
        expect(quadrantOf(point.x, point.y)).toBe(challenge.correctLocation);
      }
    }
  });

  it('keeps every point on the integer grid inside -5..5', () => {
    for (const round of allChallenges()) {
      for (const challenge of round) {
        for (const point of [challenge.point, challenge.pair]) {
          if (!point) continue;
          expect(Number.isInteger(point.x)).toBe(true);
          expect(Number.isInteger(point.y)).toBe(true);
          expect(Math.abs(point.x)).toBeLessThanOrEqual(5);
          expect(Math.abs(point.y)).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('covers all four quadrants exactly once per quadrant stage (balanced by construction)', () => {
    for (let run = 0; run < RUNS; run++) {
      const stages = buildQuadrantChallengeStages();
      for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
        const stage = stages.find((s) => s.id === stageId)!;
        const locations = stage.challenges.map((c) => c.correctLocation ?? c.highlightQuadrant);
        expect([...locations].sort()).toEqual([1, 2, 3, 4]);
      }
    }
  });

  it('stage 4 asks for the signs matching the highlighted quadrant', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildQuadrantChallengeStages().find((s) => s.id === 'stage4')!;
      for (const challenge of stage.challenges) {
        expect(challenge.kind).toBe('signs');
        expect(challenge.correctSigns).toEqual(quadrantSigns[challenge.highlightQuadrant!]);
      }
    }
  });
});

describe('quadrant challenge — axis and origin cases', () => {
  it('never labels an axis point as a quadrant, and labels it with the right axis', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildQuadrantChallengeStages().find((s) => s.id === 'stage5')!;
      for (const challenge of stage.challenges) {
        const point = challenge.pair!;
        const expected =
          point.x === 0 && point.y === 0 ? 'origin' : point.y === 0 ? 'xAxis' : point.x === 0 ? 'yAxis' : 'quadrant';
        expect(challenge.correctLocation).toBe(expected);
        expect(typeof challenge.correctLocation).toBe('string');
      }
    }
  });

  it('offers axis and origin options alongside the four quadrants in the mixed stage', () => {
    const stage = buildQuadrantChallengeStages().find((s) => s.id === 'stage5')!;
    for (const challenge of stage.challenges) {
      const optionIds = challenge.options!.map((o) => o.id);
      expect(optionIds).toEqual([1, 2, 3, 4, 'xAxis', 'yAxis', 'origin']);
      expect(optionIds).toContain(challenge.correctLocation);
    }
  });

  it('includes the origin and both axes at least once in the mixed stage', () => {
    const stage = buildQuadrantChallengeStages().find((s) => s.id === 'stage5')!;
    const locations = new Set(stage.challenges.map((c) => c.correctLocation));
    expect(locations).toContain('xAxis');
    expect(locations).toContain('yAxis');
    expect(locations).toContain('origin');
  });
});

describe('quadrant challenge — round structure', () => {
  it('generates unique challenge ids and the advertised total', () => {
    for (let run = 0; run < RUNS; run++) {
      const challenges = buildQuadrantChallengeStages().flatMap((s) => s.challenges);
      expect(challenges).toHaveLength(QUADRANT_CHALLENGE_TOTAL);
      expect(new Set(challenges.map((c) => c.id)).size).toBe(challenges.length);
    }
  });
});
