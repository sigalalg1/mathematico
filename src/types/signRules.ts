export type SignRuleOperator = '×' | ':';

/** Which sign-rule case a question exercises, named by the signs of its two numbers. */
export type SignRuleFamily = 'posPos' | 'posNeg' | 'negPos' | 'negNeg';

export const SIGN_RULE_FAMILIES: SignRuleFamily[] = ['posPos', 'posNeg', 'negPos', 'negNeg'];

/**
 * - `signError`      — the size is right, the sign is not.
 * - `magnitudeError` — the numbers themselves were worked out wrong.
 */
export type SignRuleMistake = 'signError' | 'magnitudeError';

/** One already-solved line of the descending pattern that leads into the question. */
export interface SignLadderRow {
  left: number;
  right: number;
  result: number;
}

export interface SignRuleChallenge {
  id: string;
  min: number;
  max: number;
  step: number;
  operator: SignRuleOperator;
  left: number;
  right: number;
  result: number;
  family: SignRuleFamily;
  /** True for the discovery questions, where the pattern is the whole point. */
  showLadder: boolean;
  /** Empty for division, which has no natural descending pattern here. */
  ladder: SignLadderRow[];
}
