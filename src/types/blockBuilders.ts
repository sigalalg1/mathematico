export type BlockMissionKind = 'buildArray' | 'matchBuild' | 'completeBuild' | 'missingFactor' | 'quickBuild';

export interface BuildOption {
  id: string;
  rows: number;
  columns: number;
}

export interface BlockMission {
  id: string;
  kind: BlockMissionKind;
  rows: number;
  columns: number;
  product: number;
  choices: number[];
  buildOptions?: BuildOption[];
  missingCount?: number;
  intentionalReverse?: boolean;
}

export interface BlockAnswer {
  value: string;
}

export type BlockFeedback = 'correct' | 'tooFew' | 'tooMany' | 'reversed' | 'different';
