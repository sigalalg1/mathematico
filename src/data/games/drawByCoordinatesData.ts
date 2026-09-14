import type { DrawingDef, Point } from '../../types/drawByCoordinates';

export const DRAW_BY_COORDINATES_MIN = -5;
export const DRAW_BY_COORDINATES_MAX = 5;

const p = (x: number, y: number): Point => ({ x, y });

// Hand-designed connect-the-dots drawings. Each is a single continuous stroke
// (the pen never lifts), so the sequence may legitimately revisit an earlier,
// non-adjacent point to retrace a line — it just must never repeat the same
// point twice *in a row* (that would be a zero-length segment).
const DRAWINGS: DrawingDef[] = [
  {
    id: 'house',
    nameKey: 'drawByCoordinates.drawings.house',
    emoji: '🏠',
    points: [
      p(0, 0),
      p(4, 0),
      p(4, 3),
      p(2, 5),
      p(0, 3),
      p(0, 0),
      p(1, 0),
      p(1, 2),
      p(3, 2),
      p(3, 0),
      p(4, 0),
    ],
  },
  {
    id: 'tree',
    nameKey: 'drawByCoordinates.drawings.tree',
    emoji: '🌳',
    points: [p(-1, -4), p(1, -4), p(1, -1), p(3, -1), p(0, 4), p(-3, -1), p(-1, -1), p(-1, -4)],
  },
  {
    id: 'boat',
    nameKey: 'drawByCoordinates.drawings.boat',
    emoji: '⛵',
    points: [p(-3, -2), p(3, -2), p(2, 0), p(0, 0), p(0, 4), p(2, 0), p(0, 0), p(-2, 0), p(-3, -2)],
  },
  {
    id: 'rocket',
    nameKey: 'drawByCoordinates.drawings.rocket',
    emoji: '🚀',
    points: [
      p(0, 5),
      p(1, 2),
      p(1, -2),
      p(2, -4),
      p(1, -2),
      p(-1, -2),
      p(-2, -4),
      p(-1, -2),
      p(-1, 2),
      p(0, 5),
    ],
  },
  {
    id: 'star',
    nameKey: 'drawByCoordinates.drawings.star',
    emoji: '⭐',
    points: [
      p(0, 5),
      p(1, 2),
      p(4, 2),
      p(2, 0),
      p(3, -3),
      p(0, -1),
      p(-3, -3),
      p(-2, 0),
      p(-4, 2),
      p(-1, 2),
      p(0, 5),
    ],
  },
];

function assertValidDrawing(drawing: DrawingDef): void {
  if (drawing.points.length < 8 || drawing.points.length > 15) {
    throw new Error(`Drawing "${drawing.id}" must have 8-15 points, has ${drawing.points.length}`);
  }
  for (let i = 0; i < drawing.points.length; i++) {
    const point = drawing.points[i];
    if (point.x < DRAW_BY_COORDINATES_MIN || point.x > DRAW_BY_COORDINATES_MAX || point.y < DRAW_BY_COORDINATES_MIN || point.y > DRAW_BY_COORDINATES_MAX) {
      throw new Error(`Drawing "${drawing.id}" has an out-of-range point at index ${i}: (${point.x}, ${point.y})`);
    }
    if (i > 0) {
      const prev = drawing.points[i - 1];
      if (prev.x === point.x && prev.y === point.y) {
        throw new Error(`Drawing "${drawing.id}" has a zero-length segment at index ${i}`);
      }
    }
  }
}

DRAWINGS.forEach(assertValidDrawing);

export function getDrawings(): DrawingDef[] {
  return DRAWINGS;
}

/** Picks a random drawing, preferring one different from the last one played. */
export function pickRandomDrawing(excludeId?: string): DrawingDef {
  const candidates = DRAWINGS.length > 1 ? DRAWINGS.filter((d) => d.id !== excludeId) : DRAWINGS;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
