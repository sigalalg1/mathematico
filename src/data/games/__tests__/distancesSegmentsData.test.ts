import { describe, expect, it } from 'vitest';
import { buildDistancesSegmentsStages, DISTANCES_SEGMENTS_TOTAL } from '../distancesSegmentsData';
import type { SegmentChallenge } from '../../../types/distancesSegments';

const RUNS = 500;

function everySegment(): SegmentChallenge[] {
  const all: SegmentChallenge[] = [];
  for (let run = 0; run < RUNS; run++) {
    for (const stage of buildDistancesSegmentsStages()) {
      all.push(...stage.challenges);
    }
  }
  return all;
}

describe('distances and segments — segment invariants', () => {
  const segments = everySegment();

  it('produces only axis-parallel segments (grade 7 has no distance formula)', () => {
    for (const segment of segments) {
      const horizontal = segment.a.y === segment.b.y && segment.a.x !== segment.b.x;
      const vertical = segment.a.x === segment.b.x && segment.a.y !== segment.b.y;
      expect(horizontal || vertical).toBe(true);
      expect(horizontal && vertical).toBe(false);
    }
  });

  it('labels a horizontal segment axis "x" and a vertical one axis "y"', () => {
    for (const segment of segments) {
      if (segment.axis === 'x') {
        expect(segment.a.y).toBe(segment.b.y);
        expect(segment.a.x).not.toBe(segment.b.x);
      } else {
        expect(segment.a.x).toBe(segment.b.x);
        expect(segment.a.y).not.toBe(segment.b.y);
      }
    }
  });

  it('never produces a zero-length (degenerate) segment', () => {
    for (const segment of segments) {
      expect(segment.length).toBeGreaterThan(0);
    }
  });

  it('states a length that equals the real distance between the endpoints', () => {
    for (const segment of segments) {
      const expected = segment.axis === 'x' ? Math.abs(segment.a.x - segment.b.x) : Math.abs(segment.a.y - segment.b.y);
      expect(segment.length).toBe(expected);
      // Axis-parallel, so the Euclidean distance must agree too.
      expect(Math.hypot(segment.a.x - segment.b.x, segment.a.y - segment.b.y)).toBe(segment.length);
    }
  });

  it('keeps both endpoints on integer coordinates inside the -5..5 grid', () => {
    for (const segment of segments) {
      for (const point of [segment.a, segment.b]) {
        expect(Number.isInteger(point.x)).toBe(true);
        expect(Number.isInteger(point.y)).toBe(true);
        expect(Math.abs(point.x)).toBeLessThanOrEqual(5);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('distances and segments — stage difficulty rules', () => {
  it('stage 1 keeps the varying coordinate positive', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildDistancesSegmentsStages().find((s) => s.id === 'stage1')!;
      for (const segment of stage.challenges) {
        const values = segment.axis === 'x' ? [segment.a.x, segment.b.x] : [segment.a.y, segment.b.y];
        for (const value of values) expect(value).toBeGreaterThan(0);
      }
    }
  });

  it('stage 3 keeps the varying coordinate negative', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildDistancesSegmentsStages().find((s) => s.id === 'stage3')!;
      for (const segment of stage.challenges) {
        const values = segment.axis === 'x' ? [segment.a.x, segment.b.x] : [segment.a.y, segment.b.y];
        for (const value of values) expect(value).toBeLessThan(0);
      }
    }
  });

  it('produces crossing-zero segments in the mixed stages, with the correct length', () => {
    let crossings = 0;
    for (let run = 0; run < RUNS; run++) {
      for (const stage of buildDistancesSegmentsStages()) {
        if (stage.id !== 'stage2' && stage.id !== 'stage4') continue;
        for (const segment of stage.challenges) {
          const [v1, v2] = segment.axis === 'x' ? [segment.a.x, segment.b.x] : [segment.a.y, segment.b.y];
          if (v1 * v2 >= 0) continue;
          crossings++;
          // A segment spanning the axis is |negative| + |positive| long.
          expect(segment.length).toBe(Math.abs(v1) + Math.abs(v2));
        }
      }
    }
    expect(crossings).toBeGreaterThan(0);
  });

  it('balances stage 4 across both axes instead of flipping a coin per item', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildDistancesSegmentsStages().find((s) => s.id === 'stage4')!;
      const axes = stage.challenges.map((c) => c.axis);
      expect(axes.filter((a) => a === 'x')).toHaveLength(2);
      expect(axes.filter((a) => a === 'y')).toHaveLength(2);
    }
  });
});

describe('distances and segments — round structure', () => {
  it('never repeats the exact same segment twice inside one stage', () => {
    for (let run = 0; run < RUNS; run++) {
      for (const stage of buildDistancesSegmentsStages()) {
        const keys = stage.challenges.map((c) => `${c.axis}:${c.a.x},${c.a.y}-${c.b.x},${c.b.y}`);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it('generates unique ids and the advertised total', () => {
    for (let run = 0; run < RUNS; run++) {
      const challenges = buildDistancesSegmentsStages().flatMap((s) => s.challenges);
      expect(challenges).toHaveLength(DISTANCES_SEGMENTS_TOTAL);
      expect(new Set(challenges.map((c) => c.id)).size).toBe(challenges.length);
    }
  });
});
