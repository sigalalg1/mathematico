import type { AngleType, Point, TriangleAngleType, TriangleClassification, TriangleSideType } from '../types/geometry';

export const RIGHT_ANGLE_TOLERANCE = 0.5;
export const SIDE_EQUALITY_TOLERANCE = 0.025;
export const MIN_TRIANGLE_ANGLE = 12;

/**
 * Visual safety margin around 90°. An acute or obtuse angle that a child has to
 * classify by eye must be far enough from a right angle that the answer is a
 * concept question and not a pixel-measuring exercise, so generators must never
 * produce a non-right angle inside `90 ± NON_RIGHT_ANGLE_MARGIN`.
 */
export const NON_RIGHT_ANGLE_MARGIN = 15;

export function isVisuallyUnambiguousAngle(degrees: number, margin = NON_RIGHT_ANGLE_MARGIN): boolean {
  const difference = Math.abs(degrees - 90);
  return difference <= RIGHT_ANGLE_TOLERANCE || difference >= margin;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function angleFromVertex(start: Point, vertex: Point, end: Point): number {
  const first = Math.atan2(start.y - vertex.y, start.x - vertex.x);
  const second = Math.atan2(end.y - vertex.y, end.x - vertex.x);
  const difference = Math.abs(((second - first) * 180) / Math.PI);
  return difference > 180 ? 360 - difference : difference;
}

export function classifyAngle(degrees: number, tolerance = RIGHT_ANGLE_TOLERANCE): AngleType {
  if (Math.abs(degrees - 90) <= tolerance) return 'right';
  return degrees < 90 ? 'acute' : 'obtuse';
}

export function dragAngle(vertex: Point, pointer: Point, fixedRayDegrees = 0): number {
  const pointerDegrees = normalizeDegrees((Math.atan2(pointer.y - vertex.y, pointer.x - vertex.x) * 180) / Math.PI);
  const difference = normalizeDegrees(pointerDegrees - fixedRayDegrees);
  return Math.min(difference, 360 - difference);
}

export function rotatePoint(point: Point, degrees: number, center: Point = { x: 0, y: 0 }): Point {
  const radians = (degrees * Math.PI) / 180;
  const x = point.x - center.x;
  const y = point.y - center.y;
  return {
    x: center.x + x * Math.cos(radians) - y * Math.sin(radians),
    y: center.y + x * Math.sin(radians) + y * Math.cos(radians),
  };
}

export function rotateTriangle(points: readonly [Point, Point, Point], degrees: number): [Point, Point, Point] {
  const center = {
    x: (points[0].x + points[1].x + points[2].x) / 3,
    y: (points[0].y + points[1].y + points[2].y) / 3,
  };
  return points.map((point) => rotatePoint(point, degrees, center)) as [Point, Point, Point];
}

export function triangleSideLengths(points: readonly [Point, Point, Point]): [number, number, number] {
  return [distance(points[1], points[2]), distance(points[0], points[2]), distance(points[0], points[1])];
}

export function isValidTriangle(points: readonly [Point, Point, Point], minimumAngle = MIN_TRIANGLE_ANGLE): boolean {
  const sides = triangleSideLengths(points).sort((a, b) => a - b);
  return sides[0] > 1 && sides[0] + sides[1] > sides[2] + 1e-7 && triangleAngles(points).every((angle) => angle >= minimumAngle);
}

export function triangleAngles(points: readonly [Point, Point, Point]): [number, number, number] {
  return [
    angleFromVertex(points[1], points[0], points[2]),
    angleFromVertex(points[0], points[1], points[2]),
    angleFromVertex(points[0], points[2], points[1]),
  ];
}

/**
 * Whole-degree angle labels for a drawn triangle.
 *
 * Rounding each angle on its own can print a set that sums to 179° or 181°,
 * which contradicts the rule the activity is teaching. Largest-remainder
 * rounding keeps every label within one degree of the real angle while
 * guaranteeing the three printed numbers add up to exactly 180.
 */
export function displayTriangleAngles(points: readonly [Point, Point, Point]): [number, number, number] {
  const exact = triangleAngles(points);
  const rounded = exact.map((angle) => Math.floor(angle));
  const byRemainder = exact
    .map((angle, index) => ({ index, remainder: angle - Math.floor(angle) }))
    .sort((a, b) => b.remainder - a.remainder);
  let missing = 180 - rounded.reduce((sum, angle) => sum + angle, 0);
  for (let position = 0; missing > 0 && position < byRemainder.length; position += 1, missing -= 1) {
    rounded[byRemainder[position].index] += 1;
  }
  return rounded as [number, number, number];
}

function nearlyEqual(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= Math.max(a, b) * tolerance;
}

/**
 * Curriculum convention: equilateral is shown as its own category. Although it
 * mathematically has at least two equal sides, it is not labelled isosceles in
 * this Grade 3 three-way classification.
 */
export function classifyTriangleBySides(points: readonly [Point, Point, Point], tolerance = SIDE_EQUALITY_TOLERANCE): TriangleSideType {
  const [a, b, c] = triangleSideLengths(points);
  if (nearlyEqual(a, b, tolerance) && nearlyEqual(b, c, tolerance)) return 'equilateral';
  if (nearlyEqual(a, b, tolerance) || nearlyEqual(a, c, tolerance) || nearlyEqual(b, c, tolerance)) return 'isosceles';
  return 'scalene';
}

export function classifyTriangleByAngles(points: readonly [Point, Point, Point], tolerance = RIGHT_ANGLE_TOLERANCE): TriangleAngleType {
  const angles = triangleAngles(points);
  if (angles.some((angle) => Math.abs(angle - 90) <= tolerance)) return 'right';
  return angles.some((angle) => angle > 90) ? 'obtuse' : 'acute';
}

export function classifyTriangle(points: readonly [Point, Point, Point]): TriangleClassification {
  return { sides: classifyTriangleBySides(points), angles: classifyTriangleByAngles(points) };
}

export function pointFromAngle(vertex: Point, degrees: number, length: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return { x: vertex.x + Math.cos(radians) * length, y: vertex.y + Math.sin(radians) * length };
}
