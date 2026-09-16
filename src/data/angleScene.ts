import type { AngleType, Point } from '../types/geometry';
import { angleFromVertex, classifyAngle } from '../utils/geometry';

/**
 * The "find an angle in the scene" backdrop.
 *
 * Every hotspot below names three points that are also the endpoints of edges
 * actually drawn in {@link AngleSceneVisual}, so a hotspot can never drift away
 * from the picture: its angle and its acute/right/obtuse type are measured from
 * the very same coordinates the SVG is drawn with, never stored by hand.
 */
export const ANGLE_SCENE_VIEWBOX = { width: 400, height: 260 } as const;

export const ANGLE_SCENE_POINTS = {
  groundLeft: { x: 0, y: 190 },
  groundRight: { x: 400, y: 190 },

  roofApex: { x: 100, y: 40 },
  roofLeft: { x: 60, y: 110 },
  roofRight: { x: 140, y: 110 },
  houseLeftFoot: { x: 60, y: 190 },
  houseRightFoot: { x: 140, y: 190 },

  kiteTop: { x: 250, y: 14 },
  kiteRight: { x: 274, y: 46 },
  kiteBottom: { x: 250, y: 78 },
  kiteLeft: { x: 226, y: 46 },

  umbrellaApex: { x: 300, y: 90 },
  umbrellaLeft: { x: 250, y: 115 },
  umbrellaRight: { x: 350, y: 115 },
  umbrellaFoot: { x: 300, y: 190 },

  tableLeft: { x: 212, y: 156 },
  tableRight: { x: 272, y: 156 },
  tableLeftFoot: { x: 212, y: 190 },
  tableRightFoot: { x: 272, y: 190 },
} satisfies Record<string, Point>;

type ScenePointId = keyof typeof ANGLE_SCENE_POINTS;

interface AngleHotspotSpec {
  id: string;
  /** i18n key of the object the angle belongs to, used for the accessible name. */
  objectKey: string;
  vertex: ScenePointId;
  /** The two points the drawn edges run towards from the vertex. */
  arms: [ScenePointId, ScenePointId];
}

const HOTSPOT_SPECS: AngleHotspotSpec[] = [
  { id: 'roof-apex', objectKey: 'roof', vertex: 'roofApex', arms: ['roofLeft', 'roofRight'] },
  { id: 'roof-eave', objectKey: 'roof', vertex: 'roofRight', arms: ['roofApex', 'houseRightFoot'] },
  { id: 'house-corner', objectKey: 'house', vertex: 'houseRightFoot', arms: ['roofRight', 'groundRight'] },
  { id: 'kite-top', objectKey: 'kite', vertex: 'kiteTop', arms: ['kiteLeft', 'kiteRight'] },
  { id: 'umbrella-top', objectKey: 'umbrella', vertex: 'umbrellaApex', arms: ['umbrellaLeft', 'umbrellaRight'] },
  { id: 'umbrella-pole', objectKey: 'umbrella', vertex: 'umbrellaFoot', arms: ['umbrellaApex', 'groundRight'] },
  { id: 'table-corner', objectKey: 'table', vertex: 'tableLeft', arms: ['tableRight', 'tableLeftFoot'] },
];

export interface AngleHotspot {
  id: string;
  objectKey: string;
  vertex: Point;
  arms: [Point, Point];
  degrees: number;
  type: AngleType;
}

export const ANGLE_SCENE_HOTSPOTS: AngleHotspot[] = HOTSPOT_SPECS.map((spec) => {
  const vertex = ANGLE_SCENE_POINTS[spec.vertex];
  const arms: [Point, Point] = [ANGLE_SCENE_POINTS[spec.arms[0]], ANGLE_SCENE_POINTS[spec.arms[1]]];
  const degrees = angleFromVertex(arms[0], vertex, arms[1]);
  return { id: spec.id, objectKey: spec.objectKey, vertex, arms, degrees, type: classifyAngle(degrees) };
});

export function angleSceneHotspotsOfType(type: AngleType): AngleHotspot[] {
  return ANGLE_SCENE_HOTSPOTS.filter((hotspot) => hotspot.type === type);
}
