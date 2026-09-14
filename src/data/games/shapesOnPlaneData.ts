import type { Point, ShapeChallenge, ShapeKind } from '../../types/shapesOnPlane';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LABELS = ['A', 'B', 'C', 'D'] as const;

function buildRectangle(): { vertices: [Point, Point, Point, Point]; width: number; height: number; shapeKind: ShapeKind } {
  const width = randomInt(2, 4);
  const height = randomInt(2, 4);
  const x0 = randomInt(-5, 5 - width);
  const y0 = randomInt(-5, 5 - height);
  const a: Point = { x: x0, y: y0 };
  const b: Point = { x: x0 + width, y: y0 };
  const c: Point = { x: x0 + width, y: y0 + height };
  const d: Point = { x: x0, y: y0 + height };
  return { vertices: [a, b, c, d], width, height, shapeKind: width === height ? 'square' : 'rectangle' };
}

function buildIsoscelesTrapezoid(): { vertices: [Point, Point, Point, Point]; shapeKind: ShapeKind } {
  const baseHalf = randomInt(3, 5);
  const topHalf = randomInt(1, baseHalf - 1);
  const height = randomInt(2, 4);
  const x0 = randomInt(-5 + baseHalf, 5 - baseHalf);
  const y0 = randomInt(-5, 5 - height);

  const a: Point = { x: x0 - baseHalf, y: y0 };
  const b: Point = { x: x0 + baseHalf, y: y0 };
  const c: Point = { x: x0 + topHalf, y: y0 + height };
  // Mirror C across the perpendicular bisector of AB so AD == BC and AB || CD.
  const d: Point = { x: a.x + b.x - c.x, y: c.y };

  const legA = Math.hypot(d.x - a.x, d.y - a.y);
  const legB = Math.hypot(c.x - b.x, c.y - b.y);
  if (a.y !== b.y || c.y !== d.y || legA !== legB) {
    throw new Error('Generated shape is not a valid isosceles trapezoid');
  }

  return { vertices: [a, b, c, d], shapeKind: 'isoscelesTrapezoid' };
}

function completeShapeChallenge(id: string): ShapeChallenge {
  const { vertices, shapeKind } = Math.random() < 0.5 ? buildIsoscelesTrapezoid() : buildRectangle();
  return {
    id,
    kind: 'completeShape',
    shapeKind,
    vertices,
    vertexLabels: [...LABELS],
    missingIndex: 3,
  };
}

function sideLengthChallenge(id: string): ShapeChallenge {
  const { vertices, width, height, shapeKind } = buildRectangle();
  const askWidth = Math.random() < 0.5;
  const from = vertices[0];
  const to = askWidth ? vertices[1] : vertices[3];
  return {
    id,
    kind: 'sideLength',
    shapeKind,
    vertices,
    vertexLabels: [...LABELS],
    askedSide: { from, to, label: askWidth ? 'AB' : 'AD' },
    answerNumber: askWidth ? width : height,
  };
}

function perimeterChallenge(id: string): ShapeChallenge {
  const { vertices, width, height, shapeKind } = buildRectangle();
  return {
    id,
    kind: 'perimeter',
    shapeKind,
    vertices,
    vertexLabels: [...LABELS],
    answerNumber: 2 * (width + height),
  };
}

function areaChallenge(id: string): ShapeChallenge {
  const { vertices, width, height, shapeKind } = buildRectangle();
  return {
    id,
    kind: 'area',
    shapeKind,
    vertices,
    vertexLabels: [...LABELS],
    answerNumber: width * height,
  };
}

export interface ShapeStageDef {
  id: string;
  nameKey: string;
  introKey: string;
  challenges: ShapeChallenge[];
}

export function buildShapesOnPlaneStages(): ShapeStageDef[] {
  const stage1 = [0, 1, 2].map((i) => completeShapeChallenge(`stage1-${i}`));
  const stage2 = [0, 1, 2].map((i) => sideLengthChallenge(`stage2-${i}`));
  const stage3 = [0, 1, 2].map((i) => perimeterChallenge(`stage3-${i}`));
  const stage4 = [0, 1, 2].map((i) => areaChallenge(`stage4-${i}`));

  return [
    { id: 'stage1', nameKey: 'shapesOnPlane.stages.stage1.name', introKey: 'shapesOnPlane.stages.stage1.intro', challenges: stage1 },
    { id: 'stage2', nameKey: 'shapesOnPlane.stages.stage2.name', introKey: 'shapesOnPlane.stages.stage2.intro', challenges: stage2 },
    { id: 'stage3', nameKey: 'shapesOnPlane.stages.stage3.name', introKey: 'shapesOnPlane.stages.stage3.intro', challenges: stage3 },
    { id: 'stage4', nameKey: 'shapesOnPlane.stages.stage4.name', introKey: 'shapesOnPlane.stages.stage4.intro', challenges: stage4 },
  ];
}

export const SHAPES_ON_PLANE_TOTAL = 12;
