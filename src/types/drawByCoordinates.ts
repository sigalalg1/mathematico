export interface Point {
  x: number;
  y: number;
}

export interface DrawingDef {
  id: string;
  nameKey: string;
  emoji: string;
  points: Point[];
}
