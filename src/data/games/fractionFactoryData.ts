import type { FractionOrder, FractionOrderKind, FractionShapeKind } from '../../types/fractionFactory';
import { shuffle } from '../../utils/shuffle';

/**
 * Introductory fractions only: denominators a 9-10 year old can see at a glance
 * and that all three whole-shapes can be cut into cleanly.
 */
export const FRACTION_DENOMINATORS = [2, 3, 4, 5, 6, 8] as const;

/** The whole-representations the factory rotates through inside a session. */
export const FRACTION_SHAPES: FractionShapeKind[] = ['circle', 'bar', 'grid'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

interface OrderSpec {
  kind: FractionOrderKind;
  /** Denominators this stage is allowed to ask for. */
  denominators: readonly number[];
  /** Numerator range, relative to the chosen denominator. */
  numerator: 'unit' | 'proper' | 'anyProper';
}

/**
 * The session arc, hidden from the child — they only ever see "orders".
 * 1: unit fractions, all attention on the cut.
 * 2: the equal-parts beat (one single order, once per session).
 * 3: full build-a-fraction with a numerator above 1.
 * 4: reverse orders — read a cut whole and write its fraction.
 * 5: a mixed finish at the same pace.
 */
const STAGES: Array<{ id: string; size: number; spec: OrderSpec }> = [
  { id: 'stage1', size: 2, spec: { kind: 'build', denominators: [2, 3, 4], numerator: 'unit' } },
  { id: 'stage2', size: 1, spec: { kind: 'equalParts', denominators: [4, 6], numerator: 'proper' } },
  { id: 'stage3', size: 2, spec: { kind: 'build', denominators: [3, 4, 5, 6], numerator: 'proper' } },
  { id: 'stage4', size: 2, spec: { kind: 'reverse', denominators: [3, 4, 5, 6, 8], numerator: 'anyProper' } },
  { id: 'stage5', size: 1, spec: { kind: 'build', denominators: [4, 5, 6, 8], numerator: 'anyProper' } },
];

export const FRACTION_FACTORY_TOTAL = STAGES.reduce((sum, stage) => sum + stage.size, 0);

function pickNumerator(denominator: number, mode: OrderSpec['numerator']): number {
  if (mode === 'unit') return 1;
  // `proper` keeps at least one piece unused, so the child can always see the
  // difference between the part they took and the whole it came from.
  if (mode === 'proper') return randomInt(2, Math.max(2, denominator - 1));
  return randomInt(2, denominator);
}

/**
 * The piece counts the cutting machine offers. Exactly one is right; the others
 * are real, nearby denominators so a wrong tap still produces a sensible cut
 * the scene can teach with ("you made fifths, the order needs quarters").
 */
export function buildCutOptions(denominator: number): number[] {
  const neighbours = FRACTION_DENOMINATORS.filter((value) => value !== denominator).sort(
    (a, b) => Math.abs(a - denominator) - Math.abs(b - denominator),
  );
  return shuffle([denominator, ...neighbours.slice(0, 2)]);
}

/** Picks `count` distinct piece indices out of `denominator` pieces. */
function pickPieces(denominator: number, count: number): number[] {
  return shuffle(Array.from({ length: denominator }, (_, i) => i))
    .slice(0, count)
    .sort((a, b) => a - b);
}

function buildOrder(id: string, stageId: string, spec: OrderSpec, shape: FractionShapeKind): FractionOrder {
  const denominator = pick(spec.denominators);
  const numerator = Math.min(pickNumerator(denominator, spec.numerator), denominator);
  return {
    id,
    stageId,
    kind: spec.kind,
    denominator,
    numerator,
    shape,
    cutOptions: spec.kind === 'build' ? buildCutOptions(denominator) : [],
    preselected: spec.kind === 'reverse' ? pickPieces(denominator, numerator) : [],
    equalPatternFirst: Math.random() < 0.5,
  };
}

function orderKey(order: FractionOrder): string {
  return `${order.numerator}/${order.denominator}`;
}

/** Regenerates until the fraction is new to this session, the way the other generators do. */
function buildUniqueOrder(
  id: string,
  stageId: string,
  spec: OrderSpec,
  shape: FractionShapeKind,
  existing: FractionOrder[],
): FractionOrder {
  const used = new Set(existing.map(orderKey));
  let order: FractionOrder;
  let guard = 0;
  do {
    order = buildOrder(id, stageId, spec, shape);
    guard += 1;
  } while (guard < 50 && used.has(orderKey(order)));
  return order;
}

/**
 * Builds one shift: a fixed pedagogical order of stages, with the fractions,
 * the offered cut sizes and the whole-shapes freshly generated each time.
 */
export function buildFractionFactoryOrders(): FractionOrder[] {
  const orders: FractionOrder[] = [];
  // A random starting shape means two shifts in a row do not open identically,
  // while the rotation still guarantees all three representations appear.
  const shapeOffset = randomInt(0, FRACTION_SHAPES.length - 1);

  for (const stage of STAGES) {
    for (let i = 0; i < stage.size; i++) {
      const shape = FRACTION_SHAPES[(shapeOffset + orders.length) % FRACTION_SHAPES.length];
      orders.push(buildUniqueOrder(`${stage.id}-${i}`, stage.id, stage.spec, shape, orders));
    }
  }

  return orders;
}

/** How many pieces a cut produces: the number the child tapped, right or wrong. */
export function isCorrectCut(order: FractionOrder, pieces: number): boolean {
  return pieces === order.denominator;
}

/** The fraction the child actually built, whatever they selected. */
export function builtFraction(order: FractionOrder, selectedCount: number): { numerator: number; denominator: number } {
  return { numerator: selectedCount, denominator: order.denominator };
}
