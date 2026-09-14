/** The three ways the factory can render a whole. The maths behind them is identical. */
export type FractionShapeKind = 'circle' | 'bar' | 'grid';

/**
 * What the child has to do with an order.
 *
 * `build`      — cut the whole into N pieces, then take K of them.
 * `equalParts` — the machine offers two cutting patterns; only the equal one is
 *                a valid way to make the requested fraction. Then take K pieces.
 * `reverse`    — an already-cut whole arrives with pieces highlighted and the
 *                child writes the fraction that matches it.
 */
export type FractionOrderKind = 'build' | 'equalParts' | 'reverse';

/** A single manufacturing order. Always a proper fraction: 0 < numerator <= denominator. */
export interface FractionOrder {
  id: string;
  stageId: string;
  kind: FractionOrderKind;
  /** How many pieces the order asks for. */
  numerator: number;
  /** How many equal pieces the whole must be cut into. */
  denominator: number;
  /** Which visual whole this order arrives as. */
  shape: FractionShapeKind;
  /** Piece counts offered by the cutting machine; contains exactly one correct value. */
  cutOptions: number[];
  /**
   * Which pieces arrive pre-highlighted on a `reverse` order. Length equals the
   * numerator; empty for the other kinds.
   */
  preselected: number[];
  /**
   * On an `equalParts` order, whether the valid (equal) cutting pattern is the
   * first of the two offered. Decided by the generator so the page never has to
   * randomise during render.
   */
  equalPatternFirst: boolean;
}

/** The answer a finished order is judged by: both decisions together. */
export interface FractionAnswer {
  denominator: number;
  /** `null` while the child has only made (or failed) the cutting decision. */
  numerator: number | null;
}
