export interface TargetPoint {
  x: number;
  y: number;
}

export type StageId = 'stage1' | 'stage2' | 'stage3';

export type MistakeType = 'xSign' | 'ySign' | 'swapped' | 'other';
