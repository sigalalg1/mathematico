/** One multiplication fact from the 2-10 tables. */
export interface MultiplicationFact {
  left: number;
  right: number;
  product: number;
}

/** One question: a fact plus the four answer balloons floating in front of the monkey. */
export interface ShooterQuestion {
  id: string;
  fact: MultiplicationFact;
  /** Four candidate products in display order; exactly one equals `fact.product`. */
  options: number[];
}

/** What the monkey is doing right now — drives its pose and expression. */
export type MonkeyPose = 'idle' | 'aiming' | 'happy' | 'puzzled';
