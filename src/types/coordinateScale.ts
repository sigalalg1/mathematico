export interface Point {
  x: number;
  y: number;
}

/** The only grid scales this activity is allowed to use. */
export const SUPPORTED_SCALES = [0.5, 1, 2, 5, 10] as const;
export type ScaleValue = (typeof SUPPORTED_SCALES)[number];

/** Why a wrong candidate is wrong — every distractor must come from one of these. */
export type ScaleMistakeKind = 'scaleAsOne' | 'wrongScale' | 'swappedXY' | 'signError';

export type ScaleOptionKind = 'correct' | ScaleMistakeKind;

export interface ScaleOption {
  id: string;
  /** Position on the drawn grid, in whole grid squares (tick indices). */
  tick: Point;
  label: string;
  kind: ScaleOptionKind;
}

/** `axisValue` asks which tick carries a value; `locatePoint` asks where a named point sits. */
export type ScaleQuestionKind = 'axisValue' | 'locatePoint';

/** What the student may use to work the scale out. */
export type ScaleEvidence = 'labels' | 'anchor';

export interface ScaleAnchor {
  tick: Point;
  label: string;
}

export interface ScaleReference {
  axis: 'x' | 'y';
  fromTick: number;
  toTick: number;
}

export interface ScaleChallenge {
  id: string;
  kind: ScaleQuestionKind;
  evidence: ScaleEvidence;
  /** Real units represented by one grid square. Identical on both axes. */
  scale: ScaleValue;
  /** Tick indices that show a number label. The origin's 0 is always shown. */
  labeledTicks: { x: number[]; y: number[] };
  /** A known, already plotted point used to infer the scale (anchor questions only). */
  anchor: ScaleAnchor | null;
  /** Which axis an `axisValue` question is about; null for `locatePoint`. */
  axis: 'x' | 'y' | null;
  /** Where the answer sits on the drawn grid. */
  targetTick: Point;
  /** The answer in real units (targetTick * scale). */
  targetValue: Point;
  /** Name shown for the asked point, e.g. "B". */
  targetLabel: string;
  /** Two ticks whose labels/positions prove the scale, used by the wrong-answer explanation. */
  reference: ScaleReference;
  options: ScaleOption[];
  correctOptionId: string;
}
