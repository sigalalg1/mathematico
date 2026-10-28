import { describe, expect, it } from 'vitest';
import { assertGeo4MeasurementChallengeIsSound, buildGeo4MeasurementQuestions, geo4MeasurementActivity } from '../grade4GeoMeasurementData';
import type { Geo4DifficultyId } from '../../../types/geometryGrade4';

const DIFFICULTIES: Geo4DifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('grade4GeoMeasurementData generator', () => {
  it('produces a sound, uniquely-correct question for every kind across many seeds and difficulties', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 50; seed += 1) {
        const questions = buildGeo4MeasurementQuestions({ difficultyId: difficulty, count: 10, seed });
        expect(questions).toHaveLength(10);
        for (const question of questions) {
          const challenge = question.payload!;
          expect(() => assertGeo4MeasurementChallengeIsSound(challenge)).not.toThrow();
          expect(question.options).toContain(question.answer);
          expect(new Set(question.options).size).toBe(question.options.length);
        }
      }
    }
  });

  it('"whichIsPerimeter"/"whichIsArea"/"sideLengthVocab": the gallery always has exactly one panel in the target mode', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const questions = buildGeo4MeasurementQuestions({ difficultyId: 'intermediate', count: 12, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.kind !== 'whichIsPerimeter' && challenge.kind !== 'whichIsArea' && challenge.kind !== 'sideLengthVocab') continue;
        const targetMode = challenge.kind === 'whichIsPerimeter' ? 'perimeter' : challenge.kind === 'whichIsArea' ? 'area' : 'sideLength';
        const matching = challenge.gallery!.filter((g) => g.mode === targetMode);
        expect(matching).toHaveLength(1);
        expect(question.answer).toBe(matching[0].id);
      }
    }
  });

  it('"unitMatch": perimeter always maps to cm and area always maps to cm2', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const questions = buildGeo4MeasurementQuestions({ difficultyId: 'basic', count: 10, seed });
      const unitQuestions = questions.filter((q) => q.payload!.kind === 'unitMatch');
      for (const question of unitQuestions) {
        const mode = question.payload!.gallery![0].mode;
        expect(question.answer).toBe(mode === 'perimeter' ? 'cm' : 'cm2');
      }
    }
  });

  it('"conceptTrueFalse": answer is always a plain true/false', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const questions = buildGeo4MeasurementQuestions({ difficultyId: 'advanced', count: 10, seed });
      const claimQuestions = questions.filter((q) => q.payload!.kind === 'conceptTrueFalse');
      for (const question of claimQuestions) {
        expect(['true', 'false']).toContain(question.answer);
      }
    }
  });

  it('never asks for a numeric perimeter or area computation (vocabulary/conceptual scope only)', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const questions = buildGeo4MeasurementQuestions({ difficultyId: 'advanced', count: 12, seed });
      for (const question of questions) {
        // Every answer is one of a small symbolic set (a gallery id, a unit, or true/false) — never a bare number.
        expect(/^\d+$/.test(question.answer)).toBe(false);
      }
    }
  });

  it('determinism: the same seed reproduces the identical session', () => {
    const a = buildGeo4MeasurementQuestions({ difficultyId: 'intermediate', count: 8, seed: 555 });
    const b = buildGeo4MeasurementQuestions({ difficultyId: 'intermediate', count: 8, seed: 555 });
    expect(a.map((q) => q.answer)).toEqual(b.map((q) => q.answer));
  });

  it('is registered with three difficulty levels', () => {
    expect(geo4MeasurementActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
  });
});
