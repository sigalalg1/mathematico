export interface Point {
  x: number;
  y: number;
}

export type ShapeChallengeKind = 'completeShape' | 'sideLength' | 'perimeter' | 'area';
export type ShapeKind = 'rectangle' | 'square' | 'isoscelesTrapezoid';

export interface ShapeChallenge {
  id: string;
  kind: ShapeChallengeKind;
  shapeKind: ShapeKind;
  vertices: [Point, Point, Point, Point];
  vertexLabels: [string, string, string, string];
  missingIndex?: number;
  askedSide?: { from: Point; to: Point; label: string };
  answerNumber?: number;
}

export type ShapeAnswer = { kind: 'point'; value: Point } | { kind: 'number'; value: number };
