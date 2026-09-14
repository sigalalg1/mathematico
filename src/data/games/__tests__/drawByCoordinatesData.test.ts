import { describe, expect, it } from 'vitest';
import {
  DRAW_BY_COORDINATES_MAX,
  DRAW_BY_COORDINATES_MIN,
  getDrawings,
  pickRandomDrawing,
} from '../drawByCoordinatesData';

const drawings = getDrawings();

describe('draw by coordinates — hand-designed drawing data', () => {
  it('ships several distinct drawings with unique ids', () => {
    expect(drawings.length).toBeGreaterThanOrEqual(5);
    expect(new Set(drawings.map((d) => d.id)).size).toBe(drawings.length);
    expect(new Set(drawings.map((d) => d.nameKey)).size).toBe(drawings.length);
  });

  it.each(drawings.map((d) => [d.id, d] as const))('%s has enough points to be worth drawing', (_id, drawing) => {
    expect(drawing.points.length).toBeGreaterThanOrEqual(8);
    expect(drawing.points.length).toBeLessThanOrEqual(15);
  });

  it.each(drawings.map((d) => [d.id, d] as const))('%s uses only integer coordinates inside the grid', (_id, drawing) => {
    for (const point of drawing.points) {
      expect(Number.isInteger(point.x)).toBe(true);
      expect(Number.isInteger(point.y)).toBe(true);
      expect(point.x).toBeGreaterThanOrEqual(DRAW_BY_COORDINATES_MIN);
      expect(point.x).toBeLessThanOrEqual(DRAW_BY_COORDINATES_MAX);
      expect(point.y).toBeGreaterThanOrEqual(DRAW_BY_COORDINATES_MIN);
      expect(point.y).toBeLessThanOrEqual(DRAW_BY_COORDINATES_MAX);
    }
  });

  it.each(drawings.map((d) => [d.id, d] as const))('%s never asks for the same point twice in a row', (_id, drawing) => {
    for (let i = 1; i < drawing.points.length; i++) {
      const previous = drawing.points[i - 1];
      const current = drawing.points[i];
      expect(`${current.x},${current.y}`).not.toBe(`${previous.x},${previous.y}`);
    }
  });

  it.each(drawings.map((d) => [d.id, d] as const))('%s is a single continuous, completable stroke', (_id, drawing) => {
    // Walking the sequence must always land on the next target, so the game is finishable.
    let index = 0;
    for (const point of drawing.points) {
      expect(point).toEqual(drawing.points[index]);
      index++;
    }
    expect(index).toBe(drawing.points.length);
    expect(drawing.emoji.length).toBeGreaterThan(0);
  });

  it('spans a reasonable part of the plane rather than collapsing into a line', () => {
    for (const drawing of drawings) {
      const xs = drawing.points.map((p) => p.x);
      const ys = drawing.points.map((p) => p.y);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(3);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('draw by coordinates — drawing selection', () => {
  it('always returns one of the defined drawings', () => {
    const ids = new Set(drawings.map((d) => d.id));
    for (let i = 0; i < 500; i++) {
      expect(ids).toContain(pickRandomDrawing().id);
    }
  });

  it('never repeats the drawing just played', () => {
    for (const drawing of drawings) {
      for (let i = 0; i < 200; i++) {
        expect(pickRandomDrawing(drawing.id).id).not.toBe(drawing.id);
      }
    }
  });

  it('can reach every drawing over many picks', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(pickRandomDrawing().id);
    expect(seen.size).toBe(drawings.length);
  });
});
