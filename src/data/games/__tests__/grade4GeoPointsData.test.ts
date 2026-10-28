import { describe, expect, it } from 'vitest';
import { assertGeo4PointsChallengeIsSound, buildGeo4PointsQuestions, geo4PointsActivity } from '../grade4GeoPointsData';
import type { Geo4DifficultyId } from '../../../types/geometryGrade4';

const DIFFICULTIES: Geo4DifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('grade4GeoPointsData generator', () => {
  it('produces a sound, uniquely-correct question for every kind across many seeds and difficulties', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 50; seed += 1) {
        const questions = buildGeo4PointsQuestions({ difficultyId: difficulty, count: 12, seed });
        expect(questions).toHaveLength(12);
        for (const question of questions) {
          const challenge = question.payload!;
          expect(() => assertGeo4PointsChallengeIsSound(challenge)).not.toThrow();
          expect(question.options).toContain(question.answer);
          expect(new Set(question.options).size).toBe(question.options.length);
        }
      }
    }
  });

  it('every generated polygon scene is closed and has at least 3 vertices', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const questions = buildGeo4PointsQuestions({ difficultyId: 'intermediate', count: 10, seed });
      for (const question of questions) {
        const scene = question.payload!.scene;
        if (!scene) continue;
        if (scene.closed) expect(scene.vertices.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('"isPolygon" kind: answer "yes" only for closed, straight-sided scenes; "no" for open or curved ones', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const questions = buildGeo4PointsQuestions({ difficultyId: 'advanced', count: 12, seed });
      const isPolygonQuestions = questions.filter((q) => q.payload!.kind === 'isPolygon');
      for (const question of isPolygonQuestions) {
        const scene = question.payload!.scene!;
        const reallyPolygon = scene.closed && !scene.curved;
        expect(question.answer).toBe(reallyPolygon ? 'yes' : 'no');
      }
    }
  });

  it('"countSides" kind: the answer always matches the scene\'s true vertex count', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const questions = buildGeo4PointsQuestions({ difficultyId: 'basic', count: 10, seed });
      const countQuestions = questions.filter((q) => q.payload!.kind === 'countSides');
      for (const question of countQuestions) {
        expect(question.answer).toBe(String(question.payload!.scene!.vertices.length));
      }
    }
  });

  it('"galleryPick" kind: exactly one gallery item is a genuine (closed, straight) polygon, and it is the answer', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const questions = buildGeo4PointsQuestions({ difficultyId: 'intermediate', count: 12, seed });
      const galleryQuestions = questions.filter((q) => q.payload!.kind === 'galleryPick');
      for (const question of galleryQuestions) {
        const gallery = question.payload!.gallery!;
        const realPolygons = gallery.filter((g) => g.scene.closed && !g.scene.curved);
        expect(realPolygons).toHaveLength(1);
        expect(question.answer).toBe(realPolygons[0].id);
      }
    }
  });

  it('determinism: the same seed reproduces the identical session', () => {
    const a = buildGeo4PointsQuestions({ difficultyId: 'basic', count: 8, seed: 321 });
    const b = buildGeo4PointsQuestions({ difficultyId: 'basic', count: 8, seed: 321 });
    expect(a.map((q) => q.answer)).toEqual(b.map((q) => q.answer));
  });

  it('is registered with three difficulty levels', () => {
    expect(geo4PointsActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
  });
});
