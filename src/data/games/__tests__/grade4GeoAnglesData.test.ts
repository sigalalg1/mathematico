import { describe, expect, it } from 'vitest';
import { assertGeo4AngleChallengeIsSound, buildGeo4AnglesQuestions, geo4AnglesActivity } from '../grade4GeoAnglesData';
import { angleBetweenRays, classifyAngle7, isUnambiguouslyClassifiable } from '../../../geometry/angleMath';
import type { Geo4DifficultyId } from '../../../types/geometryGrade4';

const DIFFICULTIES: Geo4DifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('grade4GeoAnglesData generator', () => {
  it('produces a sound, uniquely-correct question for every kind across many seeds and difficulties', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 50; seed += 1) {
        const questions = buildGeo4AnglesQuestions({ difficultyId: difficulty, count: 12, seed });
        expect(questions).toHaveLength(12);
        for (const question of questions) {
          const challenge = question.payload!;
          expect(() => assertGeo4AngleChallengeIsSound(challenge)).not.toThrow();
          expect(question.options).toContain(question.answer);
          expect(new Set(question.options).size).toBe(question.options.length);
        }
      }
    }
  });

  it('"classifyType": every generated angle is unambiguously classifiable (safety margin) and matches its real measure', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const questions = buildGeo4AnglesQuestions({ difficultyId: 'advanced', count: 12, seed });
      const classifyQuestions = questions.filter((q) => q.payload!.kind === 'classifyType');
      for (const question of classifyQuestions) {
        const scene = question.payload!.scene!;
        const degrees = angleBetweenRays(scene.vertex.point, scene.rays[0].through, scene.rays[1].through);
        expect(isUnambiguouslyClassifiable(degrees)).toBe(true);
        expect(classifyAngle7(degrees)).toBe(question.answer);
      }
    }
  });

  it('"selectAllRight": the answer set exactly matches which gallery angles are really 90°', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const questions = buildGeo4AnglesQuestions({ difficultyId: 'intermediate', count: 12, seed });
      const galleryQuestions = questions.filter((q) => q.payload!.kind === 'selectAllRight');
      for (const question of galleryQuestions) {
        const gallery = question.payload!.gallery!;
        const expected = gallery
          .filter((g) => {
            const degrees = angleBetweenRays(g.scene.vertex.point, g.scene.rays[0].through, g.scene.rays[1].through);
            return classifyAngle7(degrees) === 'right';
          })
          .map((g) => g.id)
          .sort()
          .join(',');
        expect(question.answer).toBe(expected);
        expect(question.answer.length).toBeGreaterThan(0); // at least one right angle every time
      }
    }
  });

  it('"tapVertexOrArm": the target is always exactly "vertex" or "arm"', () => {
    const questions = buildGeo4AnglesQuestions({ difficultyId: 'basic', count: 20, seed: 5 });
    const tapQuestions = questions.filter((q) => q.payload!.kind === 'tapVertexOrArm');
    expect(tapQuestions.length).toBeGreaterThan(0);
    for (const question of tapQuestions) {
      expect(['vertex', 'arm']).toContain(question.answer);
    }
  });

  it('determinism: the same seed reproduces the identical session', () => {
    const a = buildGeo4AnglesQuestions({ difficultyId: 'advanced', count: 8, seed: 77 });
    const b = buildGeo4AnglesQuestions({ difficultyId: 'advanced', count: 8, seed: 77 });
    expect(a.map((q) => q.answer)).toEqual(b.map((q) => q.answer));
  });

  it('is registered with three difficulty levels', () => {
    expect(geo4AnglesActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
  });
});
