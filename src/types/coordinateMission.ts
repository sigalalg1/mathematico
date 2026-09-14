import type { GridTargetId } from './vocabularyQuiz';
import type { QuadrantId, QuadrantLocation } from './quadrantChallenge';
import type { MistakeCategory } from './coordinateDetective';

export type Point = { x: number; y: number };

export type MissionChallengeKind =
  | 'identifyAxis'
  | 'readCoordinate'
  | 'placePoint'
  | 'quadrant'
  | 'axisOrQuadrant'
  | 'detectMistake'
  | 'segment'
  | 'completeRectangle';

export interface MissionChallenge {
  id: string;
  kind: MissionChallengeKind;
  promptKey: string;
  point?: Point;
  pair?: Point;
  correctAxis?: GridTargetId;
  correctPoint?: Point;
  correctQuadrant?: QuadrantId;
  choiceOptions?: { id: QuadrantLocation | MistakeCategory; labelKey: string }[];
  correctChoice?: QuadrantLocation | MistakeCategory;
  wrongAnswer?: Point;
  segmentA?: Point;
  segmentB?: Point;
  correctLength?: number;
  rectangleVertices?: [Point, Point, Point, Point];
}

export type MissionAnswer =
  | { kind: 'axis'; value: GridTargetId }
  | { kind: 'coords'; x: number; y: number }
  | { kind: 'point'; value: Point }
  | { kind: 'quadrant'; value: QuadrantId }
  | { kind: 'choice'; value: QuadrantLocation | MistakeCategory }
  | { kind: 'number'; value: number };
