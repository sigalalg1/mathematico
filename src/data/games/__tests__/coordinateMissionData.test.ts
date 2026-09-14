import { describe, expect, it } from 'vitest';
import { buildCoordinateMissionChallenges, COORDINATE_MISSION_TOTAL } from '../coordinateMissionData';
import { quadrantSigns } from '../quadrantChallengeData';
import type { MissionChallenge, Point } from '../../../types/coordinateMission';

const RUNS = 800;

function inGrid(p: Point): boolean {
  return Number.isInteger(p.x) && Number.isInteger(p.y) && Math.abs(p.x) <= 5 && Math.abs(p.y) <= 5;
}

function rounds(): MissionChallenge[][] {
  return Array.from({ length: RUNS }, () => buildCoordinateMissionChallenges());
}

function byKind(round: MissionChallenge[], id: string): MissionChallenge {
  const challenge = round.find((c) => c.id === id);
  if (!challenge) throw new Error(`missing mission challenge ${id}`);
  return challenge;
}

describe('coordinate mission — mixed capstone round', () => {
  it('always contains every challenge kind exactly once, with unique ids', () => {
    for (const round of rounds()) {
      expect(round).toHaveLength(COORDINATE_MISSION_TOTAL);
      expect(new Set(round.map((c) => c.id)).size).toBe(round.length);
      expect([...new Set(round.map((c) => c.kind))].sort()).toEqual([
        'axisOrQuadrant',
        'completeRectangle',
        'detectMistake',
        'identifyAxis',
        'placePoint',
        'quadrant',
        'readCoordinate',
        'segment',
      ]);
    }
  });

  it('keeps every point it renders inside the -5..5 integer grid', () => {
    for (const round of rounds()) {
      for (const challenge of round) {
        for (const point of [challenge.point, challenge.pair, challenge.correctPoint, challenge.wrongAnswer, challenge.segmentA, challenge.segmentB]) {
          if (point) expect(inGrid(point)).toBe(true);
        }
        for (const vertex of challenge.rectangleVertices ?? []) {
          expect(inGrid(vertex)).toBe(true);
        }
      }
    }
  });
});

describe('coordinate mission — per-challenge correctness', () => {
  it('readCoordinate marks the very point it renders as the answer', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-readCoordinate');
      expect(challenge.correctPoint).toEqual(challenge.point);
      expect(challenge.point!.x).not.toBe(0);
      expect(challenge.point!.y).not.toBe(0);
    }
  });

  it('placePoint asks for exactly the pair it shows', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-placePoint');
      expect(challenge.correctPoint).toEqual(challenge.pair);
    }
  });

  it('quadrant challenges label their point with the quadrant it really lies in', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-quadrant');
      const point = challenge.point!;
      const actual = point.x > 0 ? (point.y > 0 ? 1 : 4) : point.y > 0 ? 2 : 3;
      expect(point.x).not.toBe(0);
      expect(point.y).not.toBe(0);
      expect(challenge.correctQuadrant).toBe(actual);
    }
  });

  it('quadrantFromSigns shows sign tokens matching the expected quadrant', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-quadrantFromSigns');
      const signs = quadrantSigns[challenge.correctQuadrant!];
      expect(challenge.pair!.x > 0 ? '+' : '-').toBe(signs.x);
      expect(challenge.pair!.y > 0 ? '+' : '-').toBe(signs.y);
    }
  });

  it('axisOrQuadrant always uses a real axis point and names the right axis', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-axisOrQuadrant');
      const point = challenge.pair!;
      expect(point.x === 0 || point.y === 0).toBe(true);
      expect(point.x === 0 && point.y === 0).toBe(false);
      expect(challenge.correctChoice).toBe(point.x === 0 ? 'yAxis' : 'xAxis');
      expect(challenge.choiceOptions!.map((o) => o.id)).toContain(challenge.correctChoice);
    }
  });

  it('detectMistake really shows an X sign error and nothing else it offers', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-detectMistake');
      const target = challenge.point!;
      const wrong = challenge.wrongAnswer!;
      expect(wrong).toEqual({ x: -target.x, y: target.y });
      expect(target.x).not.toBe(0);
      // Must not simultaneously look like a Y sign error or a swap.
      expect(wrong.y === -target.y && target.y !== 0).toBe(false);
      expect(target.x !== target.y && wrong.x === target.y && wrong.y === target.x).toBe(false);
      expect(challenge.correctChoice).toBe('xSignError');
    }
  });

  it('segment is axis-parallel, non-degenerate, and states the true length', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-segment');
      const a = challenge.segmentA!;
      const b = challenge.segmentB!;
      const horizontal = a.y === b.y && a.x !== b.x;
      const vertical = a.x === b.x && a.y !== b.y;
      expect(horizontal || vertical).toBe(true);
      expect(challenge.correctLength).toBeGreaterThan(0);
      expect(challenge.correctLength).toBe(Math.hypot(a.x - b.x, a.y - b.y));
    }
  });

  it('completeRectangle shows a real rectangle whose hidden vertex D is unique and in the grid', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-completeRectangle');
      const [a, b, c, d] = challenge.rectangleVertices!;
      // Axis-aligned rectangle with positive width and height.
      expect(a.y).toBe(b.y);
      expect(b.x).toBe(c.x);
      expect(Math.abs(b.x - a.x)).toBeGreaterThan(0);
      expect(Math.abs(c.y - b.y)).toBeGreaterThan(0);
      // D is the only point completing it, and it is the advertised answer.
      expect(d).toEqual({ x: a.x + c.x - b.x, y: a.y + c.y - b.y });
      expect(challenge.correctPoint).toEqual(d);
      expect(inGrid(d)).toBe(true);
    }
  });

  it('identifyAxis asks for a concrete axis target', () => {
    for (const round of rounds()) {
      const challenge = byKind(round, 'mission-identifyAxis');
      expect(['xAxis', 'yAxis', 'origin']).toContain(challenge.correctAxis);
    }
  });
});
