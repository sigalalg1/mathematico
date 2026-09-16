import { describe, expect, it } from 'vitest';
import {
  GEOMETRY_ACTIVITY_IDS,
  generateGeometryActivity,
  isGeometryChallengeCorrect,
  validateGeneratedChallenge,
} from '../geometryAnglesTrianglesData';
import {
  NON_RIGHT_ANGLE_MARGIN,
  RIGHT_ANGLE_TOLERANCE,
  classifyAngle,
  classifyTriangle,
  displayTriangleAngles,
  triangleSideLengths,
} from '../../../utils/geometry';
import type { GeometryChallenge } from '../../../types/geometry';

const SEEDS = Array.from({ length: 250 }, (_, index) => index * 7919 + 13);

function everyChallenge(activityId: (typeof GEOMETRY_ACTIVITY_IDS)[number]): GeometryChallenge[] {
  return SEEDS.flatMap((seed) => generateGeometryActivity(activityId, seed));
}

/** Every angle a child is asked to classify by eye, across all activities. */
function classifiableAngles(): number[] {
  return GEOMETRY_ACTIVITY_IDS.flatMap((activityId) =>
    everyChallenge(activityId).flatMap((challenge) => {
      if (challenge.interaction === 'select-angle') return [challenge.angle!];
      if (challenge.interaction === 'hunt-angle') return challenge.candidates!.map((candidate) => candidate.angle!);
      return [];
    }),
  );
}

describe('generated angles', () => {
  it('keeps every non-right angle a clear distance away from 90°', () => {
    const angles = classifiableAngles();
    expect(angles.length).toBeGreaterThan(1000);
    for (const angle of angles) {
      if (classifyAngle(angle) === 'right') continue;
      expect(Math.abs(angle - 90)).toBeGreaterThanOrEqual(NON_RIGHT_ANGLE_MARGIN);
    }
  });

  it('still generates exact right angles, and only exact ones', () => {
    const angles = classifiableAngles();
    const rights = angles.filter((angle) => classifyAngle(angle) === 'right');
    expect(rights.length).toBeGreaterThan(0);
    for (const angle of rights) expect(angle).toBe(90);
  });

  it('produces all three angle types', () => {
    const types = new Set(classifiableAngles().map((angle) => classifyAngle(angle)));
    expect([...types].sort()).toEqual(['acute', 'obtuse', 'right']);
  });
});

describe('triangles by sides', () => {
  const challenges = everyChallenge('triangles-by-sides');

  it('labels every option with the class its own drawn points really have', () => {
    for (const challenge of challenges) {
      expect(validateGeneratedChallenge(challenge)).toBe(true);
      for (const candidate of challenge.candidates!) {
        const [a, b, c] = triangleSideLengths(candidate.points!);
        const equal = [Math.abs(a - b), Math.abs(a - c), Math.abs(b - c)].filter((gap) => gap < 1).length;
        if (candidate.answer === 'equilateral') expect(equal).toBe(3);
        if (candidate.answer === 'isosceles') expect(equal).toBe(1);
        if (candidate.answer === 'scalene') expect(equal).toBe(0);
        expect(classifyTriangle(candidate.points!).sides).toBe(candidate.answer);
      }
    }
  });

  it('accepts exactly the option carrying the asked-for class', () => {
    for (const challenge of challenges) {
      const correct = challenge.candidates!.filter((candidate) => candidate.answer === challenge.correctAnswer);
      expect(correct).toHaveLength(1);
      for (const candidate of challenge.candidates!) {
        expect(isGeometryChallengeCorrect(challenge, candidate.answer)).toBe(candidate.answer === challenge.correctAnswer);
      }
    }
  });

  it('never offers an equilateral triangle when the isosceles one is wanted', () => {
    const isoscelesRounds = challenges.filter((challenge) => challenge.correctAnswer === 'isosceles');
    expect(isoscelesRounds.length).toBeGreaterThan(0);
    for (const challenge of isoscelesRounds) {
      expect(challenge.candidates!.some((candidate) => candidate.answer === 'equilateral')).toBe(false);
    }
  });

  it('asks for each of the three classes over a long run', () => {
    expect(new Set(challenges.map((challenge) => challenge.correctAnswer)).size).toBe(3);
  });
});

describe('triangles by angles', () => {
  const challenges = everyChallenge('triangles-by-angles');

  it('holds the angle invariants for every drawn option', () => {
    for (const challenge of challenges) {
      expect(validateGeneratedChallenge(challenge)).toBe(true);
      for (const candidate of challenge.candidates!) {
        const shown = displayTriangleAngles(candidate.points!);
        expect(shown.reduce((sum, angle) => sum + angle, 0)).toBe(180);
        expect(classifyTriangle(candidate.points!).angles).toBe(candidate.answer);
        const rights = shown.filter((angle) => Math.abs(angle - 90) <= RIGHT_ANGLE_TOLERANCE).length;
        const obtuse = shown.filter((angle) => angle > 90).length;
        if (candidate.answer === 'right') expect(rights).toBe(1);
        if (candidate.answer === 'obtuse') expect([rights, obtuse]).toEqual([0, 1]);
        if (candidate.answer === 'acute') expect(shown.every((angle) => angle < 90)).toBe(true);
      }
    }
  });

  it('offers one option of each angle class, and accepts only the asked-for one', () => {
    for (const challenge of challenges) {
      expect(challenge.candidates!.map((candidate) => candidate.answer).sort()).toEqual(['acute', 'obtuse', 'right']);
      expect(challenge.candidates!.filter((candidate) => candidate.answer === challenge.correctAnswer)).toHaveLength(1);
    }
  });
});

describe('every generated challenge', () => {
  it('passes its own validation across all activities', () => {
    for (const activityId of GEOMETRY_ACTIVITY_IDS) {
      for (const challenge of everyChallenge(activityId)) {
        expect(validateGeneratedChallenge(challenge)).toBe(true);
      }
    }
  });

  it('classifies the single triangle shown by "ignore the rotation" from its drawn points', () => {
    for (const challenge of everyChallenge('rotation')) {
      const classification = classifyTriangle(challenge.points!);
      expect([classification.sides, classification.angles]).toContain(challenge.correctAnswer);
    }
  });
});
