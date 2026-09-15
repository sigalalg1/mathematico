export type AddSubOperator = '+' | '-';

/**
 * - `wrongDirection` — moved the opposite way along the line.
 * - `countSlip`      — right way, wrong number of steps.
 * - `other`          — did not move at all, or something unclassifiable.
 */
export type AddSubMistake = 'wrongDirection' | 'countSlip' | 'other';

export interface AddSubChallenge {
  id: string;
  min: number;
  max: number;
  step: number;
  /** Where the walker starts, the left-hand number of the expression. */
  start: number;
  operator: AddSubOperator;
  /** The right-hand number of the expression, exactly as it is written. */
  term: number;
  /** Signed movement along the line: `+term` when adding, `-term` when subtracting. */
  delta: number;
  result: number;
}
