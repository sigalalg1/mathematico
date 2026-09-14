import { describe, expect, it } from 'vitest';
import {
  buildStageDestinations,
  generateDestination,
  launchSpaceshipStages,
  LAUNCH_RANGE_MAX,
  LAUNCH_RANGE_MIN,
  LAUNCH_SPACESHIP_TOTAL,
} from '../launchSpaceshipStages';

const ITERATIONS = 1500;

describe('launch the spaceship — generated destinations', () => {
  it('always stays on integer grid coordinates inside -5..5', () => {
    for (const stage of launchSpaceshipStages) {
      for (let i = 0; i < 400; i++) {
        const point = generateDestination(stage.id, []);
        expect(Number.isInteger(point.x)).toBe(true);
        expect(Number.isInteger(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(LAUNCH_RANGE_MIN);
        expect(point.x).toBeLessThanOrEqual(LAUNCH_RANGE_MAX);
        expect(point.y).toBeGreaterThanOrEqual(LAUNCH_RANGE_MIN);
        expect(point.y).toBeLessThanOrEqual(LAUNCH_RANGE_MAX);
      }
    }
  });

  it('stage 1 stays in quadrant I so the guided walk only moves right and up', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const point = generateDestination('stage1', []);
      expect(point.x).toBeGreaterThan(0);
      expect(point.y).toBeGreaterThan(0);
    }
  });

  it('stages 2 and 4 never land on an axis', () => {
    for (const stageId of ['stage2', 'stage4'] as const) {
      for (let i = 0; i < ITERATIONS; i++) {
        const point = generateDestination(stageId, []);
        expect(point.x).not.toBe(0);
        expect(point.y).not.toBe(0);
      }
    }
  });

  it('stage 3 is always an axis point and never the origin (the ship must actually travel)', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const point = generateDestination('stage3', []);
      expect(point.x === 0 || point.y === 0).toBe(true);
      expect(point.x === 0 && point.y === 0).toBe(false);
    }
  });

  it('never repeats the two most recent destinations inside a stage', () => {
    for (let run = 0; run < 200; run++) {
      for (const stage of launchSpaceshipStages) {
        const destinations = buildStageDestinations(stage.id, stage.count);
        expect(destinations).toHaveLength(stage.count);
        for (let i = 1; i < destinations.length; i++) {
          for (const previous of destinations.slice(Math.max(0, i - 2), i)) {
            expect(`${destinations[i].x},${destinations[i].y}`).not.toBe(`${previous.x},${previous.y}`);
          }
        }
      }
    }
  });

  it('advertises a total matching the sum of its stage counts', () => {
    expect(LAUNCH_SPACESHIP_TOTAL).toBe(launchSpaceshipStages.reduce((sum, stage) => sum + stage.count, 0));
  });
});
