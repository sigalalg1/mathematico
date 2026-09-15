/** Whether the question asks for the largest or the smallest of the plotted numbers. */
export type CompareGoal = 'greatest' | 'smallest';

/**
 * Why a wrong candidate was picked:
 * - `absoluteConfusion` — they compared the digits and ignored the minus sign.
 * - `signConfusion`     — they treated a negative number as bigger than a positive one.
 * - `other`             — a middle value in a three-way comparison.
 */
export type CompareMistake = 'absoluteConfusion' | 'signConfusion' | 'other';

export interface CompareCandidate {
  id: string;
  value: number;
}

export interface CompareChallenge {
  id: string;
  min: number;
  max: number;
  step: number;
  goal: CompareGoal;
  candidates: CompareCandidate[];
  /** The value the student has to click. */
  answer: number;
  correctCandidateId: string;
}
