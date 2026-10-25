import type { Point } from '../types/geometry';
import { angleFromVertex, isValidTriangle } from '../utils/geometry';
import type { LabeledTriangle } from './types';

// Triangle side/angle classification already lives in `utils/geometry` (the
// Grade 3 geometry unit's own, well-tested math) and is reused as-is rather
// than duplicated. This module only adds what the Grade 7 *enrichment*
// activity needs: naming one interior angle of a labeled triangle, reusing
// the chapter-21 notation skill rather than inventing a new one.

export { isValidTriangle };

/** The interior angle measure at one labeled vertex of a triangle. */
export function interiorAngleAt(triangle: LabeledTriangle, vertexIndex: 0 | 1 | 2): number {
  const [a, b, c] = triangle.vertices;
  const order: [Point, Point, Point] = [a.point, b.point, c.point];
  const vertex = order[vertexIndex];
  const others = order.filter((_, index) => index !== vertexIndex) as [Point, Point];
  return angleFromVertex(others[0], vertex, others[1]);
}

/** The two arm labels (the other two vertices) for the interior angle at `vertexIndex`. */
export function interiorAngleArmLabels(triangle: LabeledTriangle, vertexIndex: 0 | 1 | 2): [string, string] {
  const labels = triangle.vertices.map((v) => v.label);
  const others = labels.filter((_, index) => index !== vertexIndex);
  return [others[0], others[1]];
}
