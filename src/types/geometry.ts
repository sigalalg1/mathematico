export interface Point {
  x: number;
  y: number;
}

export type AngleType = 'acute' | 'right' | 'obtuse';
export type TriangleSideType = 'equilateral' | 'isosceles' | 'scalene';
export type TriangleAngleType = 'acute' | 'right' | 'obtuse';

export interface TriangleClassification {
  sides: TriangleSideType;
  angles: TriangleAngleType;
}

export type GeometryActivityId =
  | 'meet-the-angle'
  | 'angle-types'
  | 'angle-hunter'
  | 'build-an-angle'
  | 'find-the-angles'
  | 'meet-the-triangle'
  | 'triangles-by-sides'
  | 'triangles-by-angles'
  | 'triangle-lab'
  | 'who-am-i'
  | 'rotation'
  | 'geometry-challenge';

export type GeometryInteraction = 'explore-angle' | 'select-angle' | 'hunt-angle' | 'build-angle' | 'find-corners' | 'explore-triangle' | 'select-sides' | 'select-triangle-angle' | 'triangle-lab' | 'riddle' | 'rotation';

export interface GeometryChallenge {
  id: string;
  activityId: GeometryActivityId;
  interaction: GeometryInteraction;
  promptKey: string;
  angle?: number;
  rotation: number;
  targetAngle?: AngleType;
  points?: [Point, Point, Point];
  candidates?: Array<{
    id: string;
    angle?: number;
    rotation: number;
    points?: [Point, Point, Point];
    answer: string;
  }>;
  correctAnswer: string;
  riddleKeys?: string[];
}
