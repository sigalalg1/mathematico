/**
 * - `evaluate`         — read `|x|` for a number that is drawn on the line.
 * - `findFromDistance` — name the number a given distance from 0, on a given side.
 * - `distanceBetween`  — measure the gap between two drawn points.
 */
export type AbsoluteKind = 'evaluate' | 'findFromDistance' | 'distanceBetween';

/**
 * - `negatedAnswer` — the student gave a negative distance.
 * - `wrongSide`     — right distance, wrong side of zero.
 * - `offByGap`      — right idea, miscounted by a tick or two.
 * - `other`         — anything else.
 */
export type AbsoluteMistake = 'negatedAnswer' | 'wrongSide' | 'offByGap' | 'other';

export interface AbsolutePlotted {
  id: string;
  value: number;
  label: string;
}

export interface AbsoluteChallenge {
  id: string;
  kind: AbsoluteKind;
  min: number;
  max: number;
  step: number;
  /** `evaluate`: the number inside the bars. `distanceBetween`: the left-hand point. */
  subject: number;
  /** `distanceBetween`: the right-hand point. Null for the other kinds. */
  partner: number | null;
  /** `findFromDistance`: the distance being asked about. */
  distance: number;
  /** `findFromDistance`: which side of zero the answer must be on. */
  side: 'negative' | 'positive' | null;
  /** The value the student has to click on the line. */
  answer: number;
  /** Points already drawn for the student to read. */
  plotted: AbsolutePlotted[];
}
