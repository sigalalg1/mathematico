import { describe, expect, it } from 'vitest';
import type { Point } from '../../types/geometry';
import { createSeededRandom } from '../../utils/seededRandom';
import {
  LABEL_POOL,
  adjacentSideIndexPairs,
  allDiagonalPairs,
  buildParallelogramVertices,
  buildPolygonScene,
  buildPolygonVertexPoints,
  buildRectangleVertices,
  buildRhombusVertices,
  buildSquareVertices,
  buildTrapezoidVertices,
  isAdjacentVertexPair,
  isDiagonalPair,
  isParallelogramShape,
  isRectangleShape,
  isRhombusShape,
  isTrapezoidShape,
  oppositeSideIndexPairsForQuad,
  polygonFamilyKey,
  segmentsAreParallel,
  segmentsArePerpendicular,
  sideCount,
  sideEndpoints,
} from '../polygonScene';

/** Standard segment-segment intersection test (proper crossing only), used to verify generated polygons are simple. */
function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}
function cross(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function isSimplePolygon(points: Point[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      // Skip adjacent sides (they legitimately share an endpoint).
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const a1 = points[i];
      const a2 = points[(i + 1) % n];
      const b1 = points[j];
      const b2 = points[(j + 1) % n];
      if (segmentsCross(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

describe('buildPolygonVertexPoints', () => {
  it('produces a simple (non-self-intersecting) polygon across many seeds, side counts and irregularity levels', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const random = createSeededRandom(seed);
      const sides = 3 + (seed % 6); // 3..8
      const points = buildPolygonVertexPoints({ x: 160, y: 160 }, sides, 90, {
        rotationDeg: (seed * 37) % 360,
        angleJitterFraction: 0.4,
        radiusJitterFraction: 0.45,
        random,
      });
      expect(points).toHaveLength(sides);
      expect(isSimplePolygon(points)).toBe(true);
    }
  });

  it('throws for fewer than 3 sides', () => {
    expect(() => buildPolygonVertexPoints({ x: 0, y: 0 }, 2, 50, {})).toThrow();
  });
});

describe('isAdjacentVertexPair / isDiagonalPair', () => {
  it('treats every pair of a triangle as adjacent, so a triangle has no diagonals', () => {
    const points = buildPolygonVertexPoints({ x: 0, y: 0 }, 3, 50, { rotationDeg: 0 });
    const scene = buildPolygonScene('tri', points, LABEL_POOL.slice(0, 3));
    expect(allDiagonalPairs(scene)).toHaveLength(0);
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        if (i === j) continue;
        expect(isAdjacentVertexPair(scene, i, j)).toBe(true);
      }
    }
  });

  it('a quadrilateral has exactly 2 diagonals, none of which is a side', () => {
    const points = buildPolygonVertexPoints({ x: 0, y: 0 }, 4, 50, { rotationDeg: 10 });
    const scene = buildPolygonScene('quad', points, LABEL_POOL.slice(0, 4));
    const diagonals = allDiagonalPairs(scene);
    expect(diagonals).toHaveLength(2);
    for (const [i, j] of diagonals) {
      expect(isAdjacentVertexPair(scene, i, j)).toBe(false);
    }
  });

  it('a pentagon has exactly 5 diagonals (n(n-3)/2)', () => {
    const points = buildPolygonVertexPoints({ x: 0, y: 0 }, 5, 50, {});
    const scene = buildPolygonScene('pent', points, LABEL_POOL.slice(0, 5));
    expect(allDiagonalPairs(scene)).toHaveLength(5);
  });

  it('an open chain has no diagonals at all, even between non-consecutive points', () => {
    const points = buildPolygonVertexPoints({ x: 0, y: 0 }, 4, 50, {});
    const scene = buildPolygonScene('chain', points, LABEL_POOL.slice(0, 4));
    scene.closed = false;
    expect(allDiagonalPairs(scene)).toHaveLength(0);
    expect(isDiagonalPair(scene, 0, 2)).toBe(false);
  });

  it('every generated N-gon (N=3..8) obeys diagonal count = N(N-3)/2 across many seeds', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const n = 3 + (seed % 6);
      const random = createSeededRandom(seed * 7 + 1);
      const points = buildPolygonVertexPoints({ x: 0, y: 0 }, n, 70, {
        rotationDeg: (seed * 11) % 360,
        angleJitterFraction: 0.3,
        radiusJitterFraction: 0.3,
        random,
      });
      const scene = buildPolygonScene('p', points, LABEL_POOL.slice(0, n));
      expect(allDiagonalPairs(scene)).toHaveLength((n * (n - 3)) / 2);
    }
  });
});

describe('sideCount / adjacentSideIndexPairs / oppositeSideIndexPairsForQuad', () => {
  it('a closed N-gon has N sides; an open chain of N points has N-1 sides', () => {
    const points = buildPolygonVertexPoints({ x: 0, y: 0 }, 5, 50, {});
    const closed = buildPolygonScene('c', points, LABEL_POOL.slice(0, 5));
    expect(sideCount(closed)).toBe(5);
    const open = { ...closed, closed: false };
    expect(sideCount(open)).toBe(4);
  });

  it('adjacent sides of a closed polygon all share exactly one vertex', () => {
    const points = buildPolygonVertexPoints({ x: 0, y: 0 }, 6, 50, {});
    const scene = buildPolygonScene('p', points, LABEL_POOL.slice(0, 6));
    const pairs = adjacentSideIndexPairs(scene);
    expect(pairs).toHaveLength(6);
    for (const [a, b] of pairs) {
      const [a1, a2] = sideEndpoints(scene, a);
      const [b1, b2] = sideEndpoints(scene, b);
      const sharesVertex = [a1, a2].some((p) => [b1, b2].some((q) => q.x === p.x && q.y === p.y));
      expect(sharesVertex).toBe(true);
    }
  });

  it('opposite sides of a quadrilateral share no vertex; is null for non-quads', () => {
    const quadPoints = buildPolygonVertexPoints({ x: 0, y: 0 }, 4, 50, {});
    const quad = buildPolygonScene('q', quadPoints, LABEL_POOL.slice(0, 4));
    const opp = oppositeSideIndexPairsForQuad(quad);
    expect(opp).toHaveLength(2);
    for (const [a, b] of opp!) {
      const [a1, a2] = sideEndpoints(quad, a);
      const [b1, b2] = sideEndpoints(quad, b);
      const sharesVertex = [a1, a2].some((p) => [b1, b2].some((q) => q.x === p.x && q.y === p.y));
      expect(sharesVertex).toBe(false);
    }
    const pentagonPoints = buildPolygonVertexPoints({ x: 0, y: 0 }, 5, 50, {});
    const pentagon = buildPolygonScene('p', pentagonPoints, LABEL_POOL.slice(0, 5));
    expect(oppositeSideIndexPairsForQuad(pentagon)).toBeNull();
  });
});

describe('polygonFamilyKey', () => {
  it('maps side counts 3..8 to the expected family names', () => {
    expect(polygonFamilyKey(3)).toBe('triangle');
    expect(polygonFamilyKey(4)).toBe('quadrilateral');
    expect(polygonFamilyKey(5)).toBe('pentagon');
    expect(polygonFamilyKey(6)).toBe('hexagon');
    expect(polygonFamilyKey(7)).toBe('heptagon');
    expect(polygonFamilyKey(8)).toBe('octagon');
  });
});

describe('segmentsAreParallel / segmentsArePerpendicular', () => {
  it('identifies a square’s opposite sides as parallel and adjacent sides as perpendicular, under rotation', () => {
    for (let rotation = 0; rotation < 360; rotation += 23) {
      const points = buildPolygonVertexPoints({ x: 0, y: 0 }, 4, 50, { rotationDeg: rotation });
      const square = buildPolygonScene('sq', points, LABEL_POOL.slice(0, 4));
      const [a0, a1] = sideEndpoints(square, 0);
      const [b0, b1] = sideEndpoints(square, 2); // opposite side
      expect(segmentsAreParallel(a0, a1, b0, b1)).toBe(true);
      const [c0, c1] = sideEndpoints(square, 1); // adjacent side
      expect(segmentsArePerpendicular(a0, a1, c0, c1)).toBe(true);
    }
  });

  it('a segment is never simultaneously flagged parallel and perpendicular to itself', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 40, y: 0 };
    expect(segmentsAreParallel(a, b, a, b)).toBe(true);
    expect(segmentsArePerpendicular(a, b, a, b)).toBe(false);
  });
});

describe('named quadrilateral builders stay unambiguous under any rotation (Group 4 recognition vocabulary)', () => {
  const center = { x: 0, y: 0 };

  it('a square is always both a rectangle-shape and a rhombus-shape', () => {
    for (let rot = 0; rot < 360; rot += 17) {
      const pts = buildSquareVertices(center, 60, rot) as [Point, Point, Point, Point];
      expect(isRectangleShape(pts)).toBe(true);
      expect(isRhombusShape(pts)).toBe(true);
    }
  });

  it('a non-square rectangle is a rectangle-shape but never a rhombus-shape', () => {
    for (let rot = 0; rot < 360; rot += 17) {
      const pts = buildRectangleVertices(center, 90, 50, rot) as [Point, Point, Point, Point];
      expect(isRectangleShape(pts)).toBe(true);
      expect(isRhombusShape(pts)).toBe(false);
    }
  });

  it('a non-square rhombus is a rhombus-shape but never a rectangle-shape', () => {
    for (let rot = 0; rot < 360; rot += 17) {
      const pts = buildRhombusVertices(center, 100, 50, rot) as [Point, Point, Point, Point];
      expect(isRhombusShape(pts)).toBe(true);
      expect(isRectangleShape(pts)).toBe(false);
    }
  });

  it('a sheared parallelogram is a parallelogram-shape but never a rectangle- or rhombus-shape', () => {
    for (let rot = 0; rot < 360; rot += 17) {
      const pts = buildParallelogramVertices(center, 50, 30, 35, rot) as [Point, Point, Point, Point];
      expect(isParallelogramShape(pts)).toBe(true);
      expect(isRectangleShape(pts)).toBe(false);
      expect(isRhombusShape(pts)).toBe(false);
      expect(isTrapezoidShape(pts)).toBe(false);
    }
  });

  it('a trapezoid has exactly one pair of parallel sides and is never a parallelogram-shape', () => {
    for (let rot = 0; rot < 360; rot += 17) {
      const pts = buildTrapezoidVertices(center, 40, 90, 60, rot) as [Point, Point, Point, Point];
      expect(isTrapezoidShape(pts)).toBe(true);
      expect(isParallelogramShape(pts)).toBe(false);
    }
  });
});
