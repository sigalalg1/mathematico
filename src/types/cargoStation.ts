/** A single cargo mission: dividend = divisor * quotient + remainder. */
export interface CargoChallenge {
  id: string;
  stageId: string;
  /** Total crates waiting on the platform. */
  dividend: number;
  /** Number of loader robots the crates are shared between. */
  divisor: number;
  /** Crates each loader ends up with. */
  quotient: number;
  /** Crates that cannot be shared equally and stay on the platform. */
  remainder: number;
}

export interface CargoAnswer {
  quotient: number;
}

export type CargoChoiceResult = 'correct' | 'tooLow' | 'tooHigh';
