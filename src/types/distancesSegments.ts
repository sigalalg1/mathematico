export interface SegmentChallenge {
  id: string;
  a: { x: number; y: number };
  b: { x: number; y: number };
  axis: 'x' | 'y';
  length: number;
}
