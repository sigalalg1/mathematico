export type AbsoluteDifficultyId = 'basic' | 'intermediate' | 'hard';
export type AbsoluteComparison = '<' | '=' | '>';
export type AbsoluteKind = 'distance' | 'direct' | 'opposites' | 'compare' | 'expression' | 'scope';

/** Structured mathematics used by the renderer and by invariant tests. */
export interface AbsoluteChallenge {
  id: string;
  kind: AbsoluteKind;
  difficulty: AbsoluteDifficultyId;
  values: number[];
  answer: string;
  options: string[];
  expression: string;
  steps: string[];
  min: number;
  max: number;
  showNumberLine: boolean;
  feedbackKey: string;
}
