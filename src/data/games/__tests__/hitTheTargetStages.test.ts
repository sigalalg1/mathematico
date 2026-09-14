import { describe, expect, it } from 'vitest';
import {
  buildStageTargets,
  generateTarget,
  hitTheTargetStages,
  HIT_THE_TARGET_RANGE_MAX,
  HIT_THE_TARGET_RANGE_MIN,
  HIT_THE_TARGET_TOTAL,
} from '../hitTheTargetStages';
import type { TargetPoint } from '../../../types/hitTheTarget';

const ITERATIONS = 2000;

function expectInGrid(point: TargetPoint) {
  expect(Number.isInteger(point.x)).toBe(true);
  expect(Number.isInteger(point.y)).toBe(true);
  expect(point.x).toBeGreaterThanOrEqual(HIT_THE_TARGET_RANGE_MIN);
  expect(point.x).toBeLessThanOrEqual(HIT_THE_TARGET_RANGE_MAX);
  expect(point.y).toBeGreaterThanOrEqual(HIT_THE_TARGET_RANGE_MIN);
  expect(point.y).toBeLessThanOrEqual(HIT_THE_TARGET_RANGE_MAX);
}

describe('hit the target — generated targets', () => {
  it('stage 1 only produces quadrant I points (never an axis point, never a negative)', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const point = generateTarget('stage1', []);
      expectInGrid(point);
      expect(point.x).toBeGreaterThan(0);
      expect(point.y).toBeGreaterThan(0);
    }
  });

  it('stage 2 never produces an axis point but does reach all four quadrants', () => {
    const quadrantsSeen = new Set<number>();
    for (let i = 0; i < ITERATIONS; i++) {
      const point = generateTarget('stage2', []);
      expectInGrid(point);
      expect(point.x).not.toBe(0);
      expect(point.y).not.toBe(0);
      quadrantsSeen.add(point.x > 0 ? (point.y > 0 ? 1 : 4) : point.y > 0 ? 2 : 3);
    }
    expect([...quadrantsSeen].sort()).toEqual([1, 2, 3, 4]);
  });

  it('stage 3 only produces axis points, never the origin', () => {
    let onX = 0;
    let onY = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const point = generateTarget('stage3', []);
      expectInGrid(point);
      expect(point.x === 0 || point.y === 0).toBe(true);
      expect(point.x === 0 && point.y === 0).toBe(false);
      if (point.y === 0) onX++;
      else onY++;
    }
    // Both axes must be reachable; the split is a coin flip, so only require non-zero.
    expect(onX).toBeGreaterThan(0);
    expect(onY).toBeGreaterThan(0);
  });

  it('never repeats the two most recent targets within a stage', () => {
    for (let run = 0; run < 300; run++) {
      for (const stage of hitTheTargetStages) {
        const targets = buildStageTargets(stage.id, stage.count);
        expect(targets).toHaveLength(stage.count);
        for (let i = 1; i < targets.length; i++) {
          const previousTwo = targets.slice(Math.max(0, i - 2), i);
          for (const previous of previousTwo) {
            expect(`${targets[i].x},${targets[i].y}`).not.toBe(`${previous.x},${previous.y}`);
          }
        }
      }
    }
  });

  it('keeps consecutive targets visually apart (not both coordinates within 1)', () => {
    for (let run = 0; run < 300; run++) {
      for (const stage of hitTheTargetStages) {
        const targets = buildStageTargets(stage.id, stage.count);
        for (let i = 1; i < targets.length; i++) {
          const tooClose =
            Math.abs(targets[i].x - targets[i - 1].x) < 2 && Math.abs(targets[i].y - targets[i - 1].y) < 2;
          expect(tooClose).toBe(false);
        }
      }
    }
  });

  it('advertises a total matching the sum of its stage counts', () => {
    expect(HIT_THE_TARGET_TOTAL).toBe(hitTheTargetStages.reduce((sum, stage) => sum + stage.count, 0));
    expect(HIT_THE_TARGET_TOTAL).toBeGreaterThan(0);
  });
});
