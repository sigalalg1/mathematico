import type { FractionShapeKind } from '../types/fractionShape';

/** Every whole is drawn inside the same square viewBox, whatever its shape. */
export const FRACTION_VIEW = 200;

export interface FractionPiece {
  /** 0-based index of the piece inside the whole. */
  index: number;
  /** SVG path for this single piece. */
  path: string;
  /** Piece centre, used to aim the "pieces separate" animation outwards. */
  cx: number;
  cy: number;
}

/** Grid layouts that keep every cell the same size and the block roughly square. */
const GRID_LAYOUTS: Record<number, [rows: number, cols: number]> = {
  1: [1, 1],
  2: [1, 2],
  3: [1, 3],
  4: [2, 2],
  5: [1, 5],
  6: [2, 3],
  8: [2, 4],
};

function gridLayout(pieces: number): [number, number] {
  return GRID_LAYOUTS[pieces] ?? [1, pieces];
}

/** Equal weights, or the lopsided ones used by the "these are not equal parts" beat. */
function weightsFor(pieces: number, unequal: boolean): number[] {
  if (!unequal) return Array.from({ length: pieces }, () => 1);
  // Deterministic, clearly uneven, and always sums back to `pieces`.
  const raw = Array.from({ length: pieces }, (_, i) => (i % 2 === 0 ? 1.7 : 0.6) + i * 0.12);
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => (value / total) * pieces);
}

function cumulative(weights: number[]): number[] {
  const edges = [0];
  for (const weight of weights) edges.push(edges[edges.length - 1] + weight);
  return edges;
}

function rect(x: number, y: number, width: number, height: number): string {
  return `M${x} ${y} H${x + width} V${y + height} H${x} Z`;
}

const CIRCLE_CENTER = FRACTION_VIEW / 2;
const CIRCLE_RADIUS = 88;

function circlePoint(fraction: number): [number, number] {
  // Start at 12 o'clock and sweep clockwise, the way a pie is cut.
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return [CIRCLE_CENTER + CIRCLE_RADIUS * Math.cos(angle), CIRCLE_CENTER + CIRCLE_RADIUS * Math.sin(angle)];
}

function circlePieces(pieces: number, unequal: boolean): FractionPiece[] {
  if (pieces <= 1) {
    const [x, y] = circlePoint(0);
    return [
      {
        index: 0,
        // Two half arcs, because a single 360° arc cannot be expressed in one sweep.
        path: `M${x} ${y} A${CIRCLE_RADIUS} ${CIRCLE_RADIUS} 0 1 1 ${x} ${y + CIRCLE_RADIUS * 2} A${CIRCLE_RADIUS} ${CIRCLE_RADIUS} 0 1 1 ${x} ${y} Z`,
        cx: CIRCLE_CENTER,
        cy: CIRCLE_CENTER,
      },
    ];
  }

  const edges = cumulative(weightsFor(pieces, unequal));
  return edges.slice(0, -1).map((_, index) => {
    const from = edges[index] / pieces;
    const to = edges[index + 1] / pieces;
    const [x0, y0] = circlePoint(from);
    const [x1, y1] = circlePoint(to);
    const largeArc = to - from > 0.5 ? 1 : 0;
    const midAngle = ((from + to) / 2) * Math.PI * 2 - Math.PI / 2;
    return {
      index,
      path: `M${CIRCLE_CENTER} ${CIRCLE_CENTER} L${x0} ${y0} A${CIRCLE_RADIUS} ${CIRCLE_RADIUS} 0 ${largeArc} 1 ${x1} ${y1} Z`,
      cx: CIRCLE_CENTER + CIRCLE_RADIUS * 0.55 * Math.cos(midAngle),
      cy: CIRCLE_CENTER + CIRCLE_RADIUS * 0.55 * Math.sin(midAngle),
    };
  });
}

const BAR = { x: 8, y: 58, width: 184, height: 84 };

function barPieces(pieces: number, unequal: boolean): FractionPiece[] {
  const edges = cumulative(weightsFor(Math.max(pieces, 1), unequal));
  const span = edges[edges.length - 1];
  return edges.slice(0, -1).map((_, index) => {
    const x = BAR.x + (edges[index] / span) * BAR.width;
    const width = ((edges[index + 1] - edges[index]) / span) * BAR.width;
    return {
      index,
      path: rect(x, BAR.y, width, BAR.height),
      cx: x + width / 2,
      cy: BAR.y + BAR.height / 2,
    };
  });
}

const BLOCK = { x: 14, y: 24, width: 172, height: 152 };

function gridPieces(pieces: number, unequal: boolean): FractionPiece[] {
  const count = Math.max(pieces, 1);
  const [rows, cols] = gridLayout(count);
  const rowHeight = BLOCK.height / rows;
  const result: FractionPiece[] = [];

  for (let row = 0; row < rows; row++) {
    // Rotating the weights per row keeps an unequal block from looking like
    // tidy columns; every cell in it is visibly a different size.
    const weights = weightsFor(cols, unequal);
    const rotated = unequal ? weights.map((_, i) => weights[(i + row) % cols]) : weights;
    const edges = cumulative(rotated);
    const span = edges[edges.length - 1];

    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      if (index >= count) break;
      const x = BLOCK.x + (edges[col] / span) * BLOCK.width;
      const width = ((edges[col + 1] - edges[col]) / span) * BLOCK.width;
      const y = BLOCK.y + row * rowHeight;
      result.push({
        index,
        path: rect(x, y, width, rowHeight),
        cx: x + width / 2,
        cy: y + rowHeight / 2,
      });
    }
  }

  return result;
}

/**
 * Turns "a whole cut into N pieces" into drawable geometry.
 *
 * The maths is the same for every shape — piece `i` of `N` is always 1/N of the
 * whole — only the outline differs, which is exactly what makes one component
 * able to render a pie, a chocolate bar or a block from identical props.
 */
export function buildFractionPieces(shape: FractionShapeKind, pieces: number, unequal = false): FractionPiece[] {
  const count = Math.max(1, Math.round(pieces));
  if (shape === 'circle') return circlePieces(count, unequal);
  if (shape === 'bar') return barPieces(count, unequal);
  return gridPieces(count, unequal);
}

/** Unit vector pointing from the centre of the whole towards a piece. */
export function separationOffset(piece: FractionPiece): { dx: number; dy: number } {
  const dx = piece.cx - FRACTION_VIEW / 2;
  const dy = piece.cy - FRACTION_VIEW / 2;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return { dx: 0, dy: 0 };
  return { dx: dx / length, dy: dy / length };
}
