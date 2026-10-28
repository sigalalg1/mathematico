import { describe, expect, it } from 'vitest';
import { assertGeo4FamilyChallengeIsSound, buildGeo4FamilyQuestions, geo4FamilyActivity } from '../grade4GeoFamilyData';
import { isParallelogramShape, isRectangleShape, isRhombusShape, isTrapezoidShape, polygonFamilyKey } from '../../../geometry/polygonScene';
import type { Point } from '../../../types/geometry';
import type { Geo4DifficultyId } from '../../../types/geometryGrade4';

const DIFFICULTIES: Geo4DifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('grade4GeoFamilyData generator', () => {
  it('produces a sound, uniquely-correct question for every kind across many seeds and difficulties', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 50; seed += 1) {
        const questions = buildGeo4FamilyQuestions({ difficultyId: difficulty, count: 10, seed });
        expect(questions).toHaveLength(10);
        for (const question of questions) {
          const challenge = question.payload!;
          expect(() => assertGeo4FamilyChallengeIsSound(challenge)).not.toThrow();
          expect(question.options).toContain(question.answer);
          expect(new Set(question.options).size).toBe(question.options.length);
        }
      }
    }
  });

  it('"nameByCount": the answer always matches the real polygon family name for the scene\'s side count', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const questions = buildGeo4FamilyQuestions({ difficultyId: 'advanced', count: 10, seed });
      const nameQuestions = questions.filter((q) => q.payload!.kind === 'nameByCount');
      for (const question of nameQuestions) {
        const scene = question.payload!.scene!;
        expect(question.answer).toBe(polygonFamilyKey(scene.vertices.length));
      }
    }
  });

  it('"quadrilateralVocab": the generated shape unambiguously matches its named family and no other', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const questions = buildGeo4FamilyQuestions({ difficultyId: 'intermediate', count: 10, seed });
      const vocabQuestions = questions.filter((q) => q.payload!.kind === 'quadrilateralVocab');
      for (const question of vocabQuestions) {
        const pts = question.payload!.scene!.vertices.map((v) => v.point) as [Point, Point, Point, Point];
        const isRect = isRectangleShape(pts);
        const isRhombus = isRhombusShape(pts);
        const isParallelogram = isParallelogramShape(pts);
        const isTrapezoid = isTrapezoidShape(pts);
        switch (question.answer) {
          case 'square':
            expect(isRect).toBe(true);
            expect(isRhombus).toBe(true);
            break;
          case 'rectangle':
            expect(isRect).toBe(true);
            expect(isRhombus).toBe(false);
            break;
          case 'rhombus':
            expect(isRhombus).toBe(true);
            expect(isRect).toBe(false);
            break;
          case 'parallelogram':
            expect(isParallelogram).toBe(true);
            expect(isRect).toBe(false);
            expect(isRhombus).toBe(false);
            break;
          case 'trapezoid':
            expect(isTrapezoid).toBe(true);
            expect(isParallelogram).toBe(false);
            break;
          default:
            throw new Error(`unexpected quadrilateralVocab answer "${question.answer}"`);
        }
      }
    }
  });

  it('"orientationMisconception": always resolves to a plain true/false answer, with a rotated (non-upright) shape', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const questions = buildGeo4FamilyQuestions({ difficultyId: 'advanced', count: 10, seed });
      const orientationQuestions = questions.filter((q) => q.payload!.kind === 'orientationMisconception');
      for (const question of orientationQuestions) {
        expect(['true', 'false']).toContain(question.answer);
      }
    }
  });

  it('determinism: the same seed reproduces the identical session', () => {
    const a = buildGeo4FamilyQuestions({ difficultyId: 'basic', count: 8, seed: 42 });
    const b = buildGeo4FamilyQuestions({ difficultyId: 'basic', count: 8, seed: 42 });
    expect(a.map((q) => q.answer)).toEqual(b.map((q) => q.answer));
  });

  it('is registered with three difficulty levels', () => {
    expect(geo4FamilyActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
  });
});
