import { describe, expect, it } from 'vitest';
import { GEOMETRY_ACTIVITY_IDS, VALID_DUAL_CLASSIFICATIONS, generateGeometryActivity, triangleTemplate, validateGeneratedChallenge } from '../../data/games/geometryAnglesTrianglesData';
import { angleFromVertex, classifyAngle, classifyTriangle, classifyTriangleByAngles, classifyTriangleBySides, dragAngle, isValidTriangle, rotateTriangle, triangleAngles } from '../geometry';

describe('geometry mathematics', () => {
  it('uses a narrow, explicit 90 degree boundary', () => {
    expect(classifyAngle(89)).toBe('acute');
    expect(classifyAngle(90)).toBe('right');
    expect(classifyAngle(91)).toBe('obtuse');
  });

  it('calculates angles from vectors independent of orientation', () => {
    expect(angleFromVertex({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angleFromVertex({ x: -1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: -1 })).toBeCloseTo(90);
    expect(dragAngle({ x: 100, y: 100 }, { x: 100, y: 20 }, 0)).toBeCloseTo(90);
  });

  it('classifies sides with equilateral as its own curriculum category', () => {
    expect(classifyTriangleBySides(triangleTemplate('equilateral', 'acute')!)).toBe('equilateral');
    expect(classifyTriangleBySides(triangleTemplate('isosceles', 'right')!)).toBe('isosceles');
    expect(classifyTriangleBySides(triangleTemplate('scalene', 'acute')!)).toBe('scalene');
  });

  it('classifies valid triangles by angles and both dimensions', () => {
    expect(classifyTriangleByAngles(triangleTemplate('scalene', 'right')!)).toBe('right');
    expect(classifyTriangleByAngles(triangleTemplate('isosceles', 'obtuse')!)).toBe('obtuse');
    expect(classifyTriangle(triangleTemplate('isosceles', 'right')!)).toEqual({ sides: 'isosceles', angles: 'right' });
  });

  it('preserves lengths, angles, and classifications under rotation', () => {
    const original = triangleTemplate('scalene', 'obtuse')!;
    const rotated = rotateTriangle(original, 217);
    expect(triangleAngles(rotated)).toEqual(expect.arrayContaining(triangleAngles(original).map((angle) => expect.closeTo(angle, 8))));
    expect(classifyTriangle(rotated)).toEqual(classifyTriangle(original));
  });

  it('keeps every template and seeded randomized challenge valid and solvable', () => {
    for (const entry of VALID_DUAL_CLASSIFICATIONS) expect(isValidTriangle(entry.points)).toBe(true);
    for (const activityId of GEOMETRY_ACTIVITY_IDS) {
      for (let seed = 1; seed <= 30; seed++) {
        const challenges = generateGeometryActivity(activityId, seed);
        expect(challenges).toHaveLength(activityId === 'geometry-challenge' ? 12 : 6);
        expect(challenges.every(validateGeneratedChallenge)).toBe(true);
      }
    }
  });

  it('never creates an impossible dual-classification riddle', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const riddle of generateGeometryActivity('who-am-i', seed)) {
        const correct = riddle.candidates!.find((candidate) => candidate.answer === riddle.correctAnswer)!;
        expect(classifyTriangle(correct.points!)).toEqual(classifyTriangle(riddle.points!));
      }
    }
  });
});
