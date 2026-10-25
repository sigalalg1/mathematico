export type SignRuleOperator = '×' | '÷';
export type SignRuleFamily = 'posPos' | 'posNeg' | 'negPos' | 'negNeg';
export type SignRuleDifficulty = 'basic' | 'intermediate' | 'hard';
export type SignRuleQuestionType =
  | 'signFirst'
  | 'multiply'
  | 'inverseDivision'
  | 'divide'
  | 'signOnly'
  | 'mixed'
  | 'expression';
export type SignRuleMistake = 'signError' | 'magnitudeError';

export const SIGN_RULE_FAMILIES: SignRuleFamily[] = ['posPos', 'posNeg', 'negPos', 'negNeg'];

export interface SignRuleQuestionPayload {
  type: SignRuleQuestionType;
  difficulty: SignRuleDifficulty;
  left: number;
  right: number;
  operator: SignRuleOperator;
  result: number;
  family: SignRuleFamily | 'zero';
  /** Present for the short two-step questions. */
  addend?: number;
  intermediate?: number;
  /** Division discovery is phrased as divisor × ? = dividend. */
  inversePrompt?: string;
}
