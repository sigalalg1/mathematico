export interface Point {
  x: number;
  y: number;
}

export interface FindPointOption {
  id: string;
  point: Point;
  label: string;
}

export interface FindPointChallenge {
  id: string;
  correct: Point;
  options: FindPointOption[];
  correctOptionId: string;
}

export interface FindPointStageDef {
  id: string;
  nameKey: string;
  introKey: string;
  challenges: FindPointChallenge[];
}
