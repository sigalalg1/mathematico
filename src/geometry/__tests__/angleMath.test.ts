import { describe, expect, it } from 'vitest';
import {
  CLASSIFICATION_SAFETY_MARGIN_DEG,
  allAnglesInScene,
  angleBetweenRays,
  classifyAngle7,
  isRayBetween,
  isUnambiguouslyClassifiable,
  mirrorScene,
  normalizeAngleMeasure,
  rotateScene,
} from '../angleMath';
import { pointFromAngle } from '../../utils/geometry';
import type { VertexScene } from '../types';

const VERTEX = { x: 150, y: 150 };

function sceneWithRayDegrees(degrees: number[]): VertexScene {
  return {
    vertex: { id: 'A', label: 'A', point: VERTEX },
    rays: degrees.map((deg, index) => ({
      id: `ray-${index}`,
      label: String.fromCharCode(66 + index),
      through: pointFromAngle(VERTEX, deg, 80 + index * 10),
    })),
  };
}

describe('normalizeAngleMeasure', () => {
  it('wraps any signed or overflowing degree value into [0, 180]', () => {
    expect(normalizeAngleMeasure(0)).toBeCloseTo(0);
    expect(normalizeAngleMeasure(90)).toBeCloseTo(90);
    expect(normalizeAngleMeasure(180)).toBeCloseTo(180);
    expect(normalizeAngleMeasure(270)).toBeCloseTo(90);
    expect(normalizeAngleMeasure(-45)).toBeCloseTo(45);
    expect(normalizeAngleMeasure(359)).toBeCloseTo(1);
  });
});

describe('classifyAngle7', () => {
  it('classifies the four Grade 7 angle types at their textbook boundaries', () => {
    expect(classifyAngle7(1)).toBe('acute');
    expect(classifyAngle7(89)).toBe('acute');
    expect(classifyAngle7(90)).toBe('right');
    expect(classifyAngle7(90.3)).toBe('right');
    expect(classifyAngle7(91)).toBe('obtuse');
    expect(classifyAngle7(179)).toBe('obtuse');
    expect(classifyAngle7(180)).toBe('straight');
    expect(classifyAngle7(179.8)).toBe('straight');
  });
});

describe('isUnambiguouslyClassifiable — the mandatory near-90°/0°/180° QA safety margin', () => {
  it('rejects angles too close to 90° to classify by eye', () => {
    for (let offset = 0; offset < CLASSIFICATION_SAFETY_MARGIN_DEG; offset += 1) {
      if (offset <= 0.5) continue; // within right-angle tolerance — a deliberate exact right angle, always "safe"
      expect(isUnambiguouslyClassifiable(90 - offset)).toBe(false);
      expect(isUnambiguouslyClassifiable(90 + offset)).toBe(false);
    }
  });

  it('rejects angles too close to 180° (straight) or 0°', () => {
    expect(isUnambiguouslyClassifiable(180 - CLASSIFICATION_SAFETY_MARGIN_DEG / 2)).toBe(false);
    expect(isUnambiguouslyClassifiable(CLASSIFICATION_SAFETY_MARGIN_DEG / 2)).toBe(false);
  });

  it('accepts angles at least the safety margin away from every boundary', () => {
    expect(isUnambiguouslyClassifiable(90 - CLASSIFICATION_SAFETY_MARGIN_DEG)).toBe(true);
    expect(isUnambiguouslyClassifiable(90 + CLASSIFICATION_SAFETY_MARGIN_DEG)).toBe(true);
    expect(isUnambiguouslyClassifiable(45)).toBe(true);
    expect(isUnambiguouslyClassifiable(135)).toBe(true);
  });

  it('always accepts an exact right or straight angle (the boundary is the point of the question)', () => {
    expect(isUnambiguouslyClassifiable(90)).toBe(true);
    expect(isUnambiguouslyClassifiable(180)).toBe(true);
  });

  it('holds across many random near-boundary samples — no silent gap in the margin check', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const degrees = (seed * 37) % 181;
      const safe = isUnambiguouslyClassifiable(degrees);
      const distanceFrom90 = Math.abs(degrees - 90);
      const isExactBoundary = distanceFrom90 <= 0.5 || degrees <= 0.5 || 180 - degrees <= 0.5;
      if (isExactBoundary) {
        expect(safe).toBe(true);
      } else if (distanceFrom90 < CLASSIFICATION_SAFETY_MARGIN_DEG || degrees < CLASSIFICATION_SAFETY_MARGIN_DEG || 180 - degrees < CLASSIFICATION_SAFETY_MARGIN_DEG) {
        expect(safe).toBe(false);
      } else {
        expect(safe).toBe(true);
      }
    }
  });
});

describe('angleBetweenRays / allAnglesInScene — mathematical accuracy', () => {
  it('measures the real angle between two ray directions regardless of each ray\'s drawn length', () => {
    const vertex = { x: 0, y: 0 };
    const a = pointFromAngle(vertex, 0, 10);
    const bShort = pointFromAngle(vertex, 90, 5);
    const bLong = pointFromAngle(vertex, 90, 500);
    expect(angleBetweenRays(vertex, a, bShort)).toBeCloseTo(90, 6);
    expect(angleBetweenRays(vertex, a, bLong)).toBeCloseTo(90, 6);
  });

  it('resolves every distinct pair of rays sharing a vertex into its own named angle (the ∠BAC/∠BAD/∠CAD worked example)', () => {
    const scene = sceneWithRayDegrees([0, 30, 70]);
    const angles = allAnglesInScene(scene);
    expect(angles).toHaveLength(3);
    const byPair = (aId: string, bId: string) =>
      angles.find((a) => (a.rayA.id === aId && a.rayB.id === bId) || (a.rayA.id === bId && a.rayB.id === aId))!;
    expect(byPair('ray-0', 'ray-1').degrees).toBeCloseTo(30, 5);
    expect(byPair('ray-1', 'ray-2').degrees).toBeCloseTo(40, 5);
    expect(byPair('ray-0', 'ray-2').degrees).toBeCloseTo(70, 5);
  });

  it('rotation and mirroring never change any angle\'s measure (the correct answer must survive both)', () => {
    const scene = sceneWithRayDegrees([10, 55, 140]);
    const base = allAnglesInScene(scene).map((a) => a.degrees).sort((x, y) => x - y);

    const rotated = allAnglesInScene(rotateScene(scene, 137));
    const rotatedDegrees = rotated.map((a) => a.degrees).sort((x, y) => x - y);
    rotatedDegrees.forEach((deg, i) => expect(deg).toBeCloseTo(base[i], 5));

    const mirrored = allAnglesInScene(mirrorScene(scene));
    const mirroredDegrees = mirrored.map((a) => a.degrees).sort((x, y) => x - y);
    mirroredDegrees.forEach((deg, i) => expect(deg).toBeCloseTo(base[i], 5));
  });
});

describe('isRayBetween', () => {
  it('is true exactly when a ray\'s angle sum matches the whole angle', () => {
    const vertex = { x: 0, y: 0 };
    const a = pointFromAngle(vertex, 0, 50);
    const mid = pointFromAngle(vertex, 30, 50);
    const b = pointFromAngle(vertex, 70, 50);
    const outside = pointFromAngle(vertex, 120, 50);
    expect(isRayBetween(vertex, a, mid, b)).toBe(true);
    expect(isRayBetween(vertex, a, outside, b)).toBe(false);
  });
});
