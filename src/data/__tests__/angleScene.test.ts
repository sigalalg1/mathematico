import { describe, expect, it } from 'vitest';
import { ANGLE_SCENE_HOTSPOTS, ANGLE_SCENE_VIEWBOX, angleSceneHotspotsOfType } from '../angleScene';
import { NON_RIGHT_ANGLE_MARGIN, angleFromVertex, classifyAngle } from '../../utils/geometry';

describe('angle hunting scene', () => {
  it('measures every hotspot from the two edges drawn at it', () => {
    for (const hotspot of ANGLE_SCENE_HOTSPOTS) {
      expect(hotspot.degrees).toBeCloseTo(angleFromVertex(hotspot.arms[0], hotspot.vertex, hotspot.arms[1]), 6);
      expect(hotspot.type).toBe(classifyAngle(hotspot.degrees));
      expect(hotspot.arms[0]).not.toEqual(hotspot.arms[1]);
    }
  });

  it('offers at least one clearly readable angle of each type', () => {
    for (const type of ['acute', 'right', 'obtuse'] as const) {
      const hotspots = angleSceneHotspotsOfType(type);
      expect(hotspots.length).toBeGreaterThan(0);
      for (const hotspot of hotspots) {
        if (type === 'right') expect(hotspot.degrees).toBeCloseTo(90, 6);
        else expect(Math.abs(hotspot.degrees - 90)).toBeGreaterThanOrEqual(NON_RIGHT_ANGLE_MARGIN);
      }
    }
  });

  it('keeps hotspots far enough apart to stay separate touch targets', () => {
    // 70 scene units is roughly 58 CSS pixels at the narrowest phone width the
    // scene renders at, comfortably clear of the 44px touch targets.
    for (const a of ANGLE_SCENE_HOTSPOTS) {
      for (const b of ANGLE_SCENE_HOTSPOTS) {
        if (a === b) continue;
        expect(Math.hypot(a.vertex.x - b.vertex.x, a.vertex.y - b.vertex.y)).toBeGreaterThanOrEqual(70);
      }
    }
  });

  it('keeps every hotspot inside the drawing and uniquely identified', () => {
    const ids = ANGLE_SCENE_HOTSPOTS.map((hotspot) => hotspot.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { vertex } of ANGLE_SCENE_HOTSPOTS) {
      expect(vertex.x).toBeGreaterThanOrEqual(0);
      expect(vertex.x).toBeLessThanOrEqual(ANGLE_SCENE_VIEWBOX.width);
      expect(vertex.y).toBeGreaterThanOrEqual(0);
      expect(vertex.y).toBeLessThanOrEqual(ANGLE_SCENE_VIEWBOX.height);
    }
  });
});
