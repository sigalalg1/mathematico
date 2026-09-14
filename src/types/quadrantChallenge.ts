export type QuadrantId = 1 | 2 | 3 | 4;
export type QuadrantLocation = QuadrantId | 'xAxis' | 'yAxis' | 'origin';
export type Sign = '+' | '-';

export interface QuadrantChallenge {
  id: string;
  kind: 'click' | 'signs' | 'choice';
  promptKey: string;
  point?: { x: number; y: number };
  pair?: { x: number; y: number };
  showSignsText?: boolean;
  highlightQuadrant?: QuadrantId;
  correctLocation?: QuadrantLocation;
  correctSigns?: { x: Sign; y: Sign };
  options?: { id: QuadrantLocation; labelKey: string }[];
}

export type QuadrantAnswer =
  | { kind: 'click'; value: QuadrantId }
  | { kind: 'signs'; x: Sign; y: Sign }
  | { kind: 'choice'; value: QuadrantLocation };
