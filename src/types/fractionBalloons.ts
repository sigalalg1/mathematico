import type { FractionShapeKind } from './fractionFactory';

/** A simple fraction not greater than one: 0 < numerator <= denominator. */
export interface BalloonFraction {
  numerator: number;
  denominator: number;
}

/**
 * How the question is asked.
 *
 * `symbolic` — the prompt names a fraction and the balloons carry fractions.
 * `visual`   — a cut whole is shown and the balloons carry fractions.
 */
export type BalloonQuestionKind = 'symbolic' | 'visual';

/** One question: a target fraction and the four balloons floating above it. */
export interface BalloonQuestion {
  id: string;
  kind: BalloonQuestionKind;
  target: BalloonFraction;
  /** Which whole a `visual` question draws; unused by `symbolic` questions. */
  shape: FractionShapeKind;
  /** Which pieces are coloured in on a `visual` question; empty otherwise. */
  selectedPieces: number[];
  /** Four candidates in display order; exactly one equals the target. */
  options: BalloonFraction[];
}
