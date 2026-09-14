export type Axis = 'x' | 'y';
export type AxisRegion = 'all' | 'positive' | 'negative';

export interface AxisHighlight {
  axis: Axis;
  region: AxisRegion;
}

export type QuizAnswerStatus = 'unanswered' | 'correct' | 'incorrect';
