/** Why a wrong tick was clicked — feedback is chosen from this, never a generic "wrong". */
export type PlacementMistake = 'signFlip' | 'offByTicks' | 'other';

export interface PlaceChallenge {
  id: string;
  min: number;
  max: number;
  /** Value distance between two neighbouring ticks. */
  step: number;
  /** Tick values that show their number. Always includes 0 and at least one more. */
  labeledValues: number[];
  /** The number the student has to find. Never 0 and never labelled. */
  target: number;
  /** Nearest labelled tick to the target — the tick the explanation counts from. */
  anchor: number;
}

/** How many ticks (and in which direction) separate the anchor from the target. */
export interface PlacementCount {
  ticks: number;
  direction: 'left' | 'right';
}
