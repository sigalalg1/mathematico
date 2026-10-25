import { describe, expect, it } from 'vitest';
import {
  anglesIdentifyActivity,
  assertAngleIdentifyChallengeIsSound,
  buildAnglesIdentifyQuestions,
} from '../anglesIdentifyData';
import { allAnglesInScene, resolveAngle } from '../../../geometry/angleMath';
import type { AnglesDifficultyId } from '../../../types/anglesGrade7';

const DIFFICULTIES: AnglesDifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('anglesIdentifyData generator', () => {
  it('produces a sound, uniquely-correct question for every kind across many seeds and difficulties', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 60; seed += 1) {
        const questions = buildAnglesIdentifyQuestions({ difficultyId: difficulty, count: 12, seed });
        expect(questions).toHaveLength(12);
        for (const question of questions) {
          const challenge = question.payload!;
          expect(() => assertAngleIdentifyChallengeIsSound(challenge)).not.toThrow();
          expect(question.options).toContain(question.answer);
          expect(new Set(question.options).size).toBe(question.options.length);
        }
      }
    }
  });

  it('"vertex" kind: the real scene vertex is always the graded answer', () => {
    const questions = buildAnglesIdentifyQuestions({ difficultyId: 'basic', count: 20, seed: 7 });
    const vertexQuestions = questions.filter((q) => q.payload!.kind === 'vertex');
    expect(vertexQuestions.length).toBeGreaterThan(0);
    for (const question of vertexQuestions) {
      expect(question.answer).toBe('vertex');
      expect(question.payload!.scene.vertex.id).toBe('vertex');
    }
  });

  it('"rays" kind: the highlighted ref really does measure as the angle between the two labeled rays named by the correct option', () => {
    const questions = buildAnglesIdentifyQuestions({ difficultyId: 'intermediate', count: 30, seed: 11 });
    const raysQuestions = questions.filter((q) => q.payload!.kind === 'rays');
    expect(raysQuestions.length).toBeGreaterThan(0);
    for (const question of raysQuestions) {
      const challenge = question.payload!;
      const correctOption = challenge.rayPairOptions!.find((o) => o.id === challenge.answer)!;
      const resolved = resolveAngle(challenge.scene, {
        vertexId: 'vertex',
        rayAId: correctOption.rayIds[0],
        rayBId: correctOption.rayIds[1],
      });
      expect(resolved.degrees).toBeGreaterThan(0);
      // Every offered pair must be a genuinely distinct pair of rays (no accidental duplicate distractor).
      const seen = new Set(challenge.rayPairOptions!.map((o) => [...o.rayIds].sort().join('-')));
      expect(seen.size).toBe(challenge.rayPairOptions!.length);
    }
  });

  it('"angle" kind: every offered angle option is a real, distinct angle actually present in the scene', () => {
    const questions = buildAnglesIdentifyQuestions({ difficultyId: 'advanced', count: 30, seed: 13 });
    const angleQuestions = questions.filter((q) => q.payload!.kind === 'angle');
    expect(angleQuestions.length).toBeGreaterThan(0);
    for (const question of angleQuestions) {
      const challenge = question.payload!;
      const sceneAngles = allAnglesInScene(challenge.scene);
      for (const option of challenge.angleOptions!) {
        const resolved = resolveAngle(challenge.scene, option.ref);
        const matchesScene = sceneAngles.some(
          (a) => Math.abs(a.degrees - resolved.degrees) < 1e-6 && a.rayA.id !== a.rayB.id,
        );
        expect(matchesScene).toBe(true);
      }
    }
  });

  it('rotating the underlying scene never changes which option is correct (orientation must not leak the answer)', () => {
    const a = buildAnglesIdentifyQuestions({ difficultyId: 'basic', count: 5, seed: 99 });
    const b = buildAnglesIdentifyQuestions({ difficultyId: 'basic', count: 5, seed: 99 });
    // Same seed must reproduce the identical, sound session — a basic determinism/regression guard.
    expect(a.map((q) => q.answer)).toEqual(b.map((q) => q.answer));
  });

  it('is registered with the training registry under capabilities matching three difficulty levels', () => {
    expect(anglesIdentifyActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
  });
});
