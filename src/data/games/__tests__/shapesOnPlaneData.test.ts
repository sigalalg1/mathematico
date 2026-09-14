import { describe, expect, it } from 'vitest';
import { buildShapesOnPlaneStages, SHAPES_ON_PLANE_TOTAL } from '../shapesOnPlaneData';
import type { Point, ShapeChallenge } from '../../../types/shapesOnPlane';

const RUNS = 300;

// --- small geometry helpers, written independently of the generator ---------

type Vec = { x: number; y: number };

const sub = (p: Point, q: Point): Vec => ({ x: p.x - q.x, y: p.y - q.y });
const cross = (u: Vec, v: Vec): number => u.x * v.y - u.y * v.x;
const dot = (u: Vec, v: Vec): number => u.x * v.x + u.y * v.y;
const len = (u: Vec): number => Math.hypot(u.x, u.y);
const parallel = (u: Vec, v: Vec): boolean => cross(u, v) === 0;

function sides(v: [Point, Point, Point, Point]): [Vec, Vec, Vec, Vec] {
  return [sub(v[1], v[0]), sub(v[2], v[1]), sub(v[3], v[2]), sub(v[0], v[3])];
}

function isSimpleQuadrilateral(v: [Point, Point, Point, Point]): boolean {
  // All four vertices distinct, no zero-length side, and the two diagonals cross
  // (true exactly for a convex, non-self-intersecting quadrilateral in order).
  const keys = new Set(v.map((p) => `${p.x},${p.y}`));
  if (keys.size !== 4) return false;
  const [ab, bc, cd, da] = sides(v);
  if ([ab, bc, cd, da].some((s) => len(s) === 0)) return false;
  const d1 = cross(sub(v[2], v[0]), sub(v[1], v[0]));
  const d2 = cross(sub(v[2], v[0]), sub(v[3], v[0]));
  const d3 = cross(sub(v[3], v[1]), sub(v[0], v[1]));
  const d4 = cross(sub(v[3], v[1]), sub(v[2], v[1]));
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function isRectangle(v: [Point, Point, Point, Point]): boolean {
  if (!isSimpleQuadrilateral(v)) return false;
  const [ab, bc, cd, da] = sides(v);
  return (
    dot(ab, bc) === 0 &&
    dot(bc, cd) === 0 &&
    dot(cd, da) === 0 &&
    parallel(ab, cd) &&
    parallel(bc, da) &&
    len(ab) === len(cd) &&
    len(bc) === len(da)
  );
}

function isSquare(v: [Point, Point, Point, Point]): boolean {
  const [ab, bc] = sides(v);
  return isRectangle(v) && len(ab) === len(bc);
}

/**
 * An isosceles trapezoid as shown to the student: AB is parallel to CD,
 * the legs BC and DA are equal, and it is a real trapezoid — exactly one
 * pair of parallel sides, so a parallelogram does not qualify.
 */
function isIsoscelesTrapezoid(v: [Point, Point, Point, Point]): boolean {
  if (!isSimpleQuadrilateral(v)) return false;
  const [ab, bc, cd, da] = sides(v);
  if (!parallel(ab, cd)) return false;
  if (parallel(bc, da)) return false;
  return len(bc) === len(da);
}

function inGrid(p: Point): boolean {
  return Number.isInteger(p.x) && Number.isInteger(p.y) && Math.abs(p.x) <= 5 && Math.abs(p.y) <= 5;
}

function allChallenges(runs = RUNS): ShapeChallenge[] {
  const all: ShapeChallenge[] = [];
  for (let run = 0; run < runs; run++) {
    for (const stage of buildShapesOnPlaneStages()) all.push(...stage.challenges);
  }
  return all;
}

// ---------------------------------------------------------------------------

describe('shapes on the plane — every generated shape is valid', () => {
  const challenges = allChallenges();

  it('keeps all four vertices on integer grid coordinates inside -5..5', () => {
    for (const challenge of challenges) {
      for (const vertex of challenge.vertices) expect(inGrid(vertex)).toBe(true);
    }
  });

  it('never produces a degenerate or self-intersecting shape', () => {
    for (const challenge of challenges) {
      expect(isSimpleQuadrilateral(challenge.vertices)).toBe(true);
    }
  });

  it('matches the shape name shown to the student to the real geometry', () => {
    for (const challenge of challenges) {
      if (challenge.shapeKind === 'square') {
        expect(isSquare(challenge.vertices)).toBe(true);
      } else if (challenge.shapeKind === 'rectangle') {
        expect(isRectangle(challenge.vertices)).toBe(true);
        expect(isSquare(challenge.vertices)).toBe(false);
      } else {
        expect(isIsoscelesTrapezoid(challenge.vertices)).toBe(true);
      }
    }
  });

  it('only ever labels the vertices A, B, C, D in order', () => {
    for (const challenge of challenges) {
      expect(challenge.vertexLabels).toEqual(['A', 'B', 'C', 'D']);
    }
  });
});

describe('shapes on the plane — rectangles and squares', () => {
  it('has positive width and height with perpendicular adjacent sides', () => {
    for (const challenge of allChallenges()) {
      if (challenge.shapeKind === 'isoscelesTrapezoid') continue;
      const [ab, bc] = sides(challenge.vertices);
      expect(len(ab)).toBeGreaterThan(0);
      expect(len(bc)).toBeGreaterThan(0);
      expect(dot(ab, bc)).toBe(0);
    }
  });

  it('reports a side length equal to the real length of the side it asks about', () => {
    for (const challenge of allChallenges()) {
      if (challenge.kind !== 'sideLength') continue;
      const { from, to, label } = challenge.askedSide!;
      expect(['AB', 'AD']).toContain(label);
      expect(challenge.answerNumber).toBe(Math.hypot(to.x - from.x, to.y - from.y));
      expect(challenge.answerNumber).toBeGreaterThan(0);
    }
  });

  it('reports a perimeter equal to the sum of the four real side lengths', () => {
    for (const challenge of allChallenges()) {
      if (challenge.kind !== 'perimeter') continue;
      const total = sides(challenge.vertices).reduce((sum, side) => sum + len(side), 0);
      expect(challenge.answerNumber).toBe(total);
    }
  });

  it('reports an area equal to width times height', () => {
    for (const challenge of allChallenges()) {
      if (challenge.kind !== 'area') continue;
      const [ab, bc] = sides(challenge.vertices);
      expect(challenge.answerNumber).toBe(len(ab) * len(bc));
      expect(challenge.answerNumber).toBeGreaterThan(0);
    }
  });
});

describe('shapes on the plane — the missing vertex', () => {
  it('always hides vertex D and hides a vertex that is actually in the grid', () => {
    for (const challenge of allChallenges()) {
      if (challenge.kind !== 'completeShape') continue;
      expect(challenge.missingIndex).toBe(3);
      expect(inGrid(challenge.vertices[3])).toBe(true);
    }
  });

  it('has exactly one valid D for a rectangle/square, given A, B and C', () => {
    for (let run = 0; run < RUNS; run++) {
      const stage = buildShapesOnPlaneStages()[0];
      for (const challenge of stage.challenges) {
        if (challenge.shapeKind === 'isoscelesTrapezoid') continue;
        const [a, b, c, d] = challenge.vertices;
        const solutions: Point[] = [];
        for (let x = -5; x <= 5; x++) {
          for (let y = -5; y <= 5; y++) {
            if (isRectangle([a, b, c, { x, y }])) solutions.push({ x, y });
          }
        }
        expect(solutions).toEqual([d]);
      }
    }
  });

  it('has exactly one valid D for an isosceles trapezoid under the conditions shown to the student', () => {
    let trapezoidsChecked = 0;
    for (let run = 0; run < RUNS; run++) {
      const stage = buildShapesOnPlaneStages()[0];
      for (const challenge of stage.challenges) {
        if (challenge.shapeKind !== 'isoscelesTrapezoid') continue;
        trapezoidsChecked++;
        const [a, b, c, d] = challenge.vertices;
        // The student is told: "Complete isosceles trapezoid ABCD" and
        // "Sides AB and CD are parallel." Anything satisfying both would be
        // an equally defensible answer, so there must be exactly one.
        const solutions: Point[] = [];
        for (let x = -5; x <= 5; x++) {
          for (let y = -5; y <= 5; y++) {
            if (isIsoscelesTrapezoid([a, b, c, { x, y }])) solutions.push({ x, y });
          }
        }
        expect(solutions).toEqual([d]);
      }
    }
    expect(trapezoidsChecked).toBeGreaterThan(0);
  });

  it('really does mirror C across the perpendicular bisector of AB', () => {
    for (let run = 0; run < RUNS; run++) {
      for (const challenge of buildShapesOnPlaneStages()[0].challenges) {
        if (challenge.shapeKind !== 'isoscelesTrapezoid') continue;
        const [a, b, c, d] = challenge.vertices;
        expect(d).toEqual({ x: a.x + b.x - c.x, y: c.y });
        expect(a.y).toBe(b.y);
        expect(c.y).toBe(d.y);
        expect(len(sub(d, a))).toBe(len(sub(c, b)));
      }
    }
  });
});

describe('shapes on the plane — round structure', () => {
  it('produces four stages with unique ids and the advertised total', () => {
    for (let run = 0; run < 200; run++) {
      const stages = buildShapesOnPlaneStages();
      expect(stages.map((s) => s.id)).toEqual(['stage1', 'stage2', 'stage3', 'stage4']);
      const challenges = stages.flatMap((s) => s.challenges);
      expect(challenges).toHaveLength(SHAPES_ON_PLANE_TOTAL);
      expect(new Set(challenges.map((c) => c.id)).size).toBe(challenges.length);
      expect(stages[0].challenges.every((c) => c.kind === 'completeShape')).toBe(true);
      expect(stages[1].challenges.every((c) => c.kind === 'sideLength')).toBe(true);
      expect(stages[2].challenges.every((c) => c.kind === 'perimeter')).toBe(true);
      expect(stages[3].challenges.every((c) => c.kind === 'area')).toBe(true);
    }
  });

  it('generates both trapezoids and rectangles over many rounds', () => {
    const kinds = new Set(allChallenges(200).map((c) => c.shapeKind));
    expect(kinds).toContain('isoscelesTrapezoid');
    expect(kinds).toContain('rectangle');
  });
});
