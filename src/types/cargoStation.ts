/** A single "share the crates" delivery: dividend = divisor * quotient + remainder. */
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
  remainder: number;
}

/** Why a proposed distribution is not a valid equal share yet. */
export type SplitProblem = 'unequal' | 'canGiveMore';
