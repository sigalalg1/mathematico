import { describe, expect, it } from 'vitest';
import { anglesMeasureActivity, assertAngleMeasureChallengeIsSound, buildAnglesMeasureQuestions } from '../anglesMeasureData';
import { directionDegrees } from '../../../geometry/angleMath';
import type { AnglesDifficultyId } from '../../../types/anglesGrade7';

const DIFFICULTIES: AnglesDifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('anglesMeasureData generator', () => {
  it('produces a sound challenge (per assertAngleMeasureChallengeIsSound) across many seeds and all three difficulties', () => {
    let count = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 200; seed += 1) {
        const questions = buildAnglesMeasureQuestions({ difficultyId: difficulty, count: 6, seed });
        for (const question of questions) {
          const challenge = question.payload!;
          expect(() => assertAngleMeasureChallengeIsSound(challenge)).not.toThrow();
          expect(challenge.difficulty).toBe(difficulty);
          count += 1;
        }
      }
    }
    expect(count).toBe(DIFFICULTIES.length * 200 * 6);
  });

  it('never generates a degenerate target — always strictly between 0° and 180°, with real clearance', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 300; seed += 1) {
        const questions = buildAnglesMeasureQuestions({ difficultyId: difficulty, count: 5, seed });
        for (const question of questions) {
          const challenge = question.payload!;
          expect(challenge.targetDegrees).toBeGreaterThan(10);
          expect(challenge.targetDegrees).toBeLessThan(170);
        }
      }
    }
  });

  it('basic tier always lands on a multiple of 5°; intermediate/advanced allow arbitrary integer degrees', () => {
    let sawNonMultipleOf5 = false;
    for (let seed = 0; seed < 300; seed += 1) {
      const basicQuestions = buildAnglesMeasureQuestions({ difficultyId: 'basic', count: 5, seed });
      for (const question of basicQuestions) {
        expect(question.payload!.targetDegrees % 5).toBe(0);
      }
      const advancedQuestions = buildAnglesMeasureQuestions({ difficultyId: 'advanced', count: 5, seed });
      for (const question of advancedQuestions) {
        if (question.payload!.targetDegrees % 5 !== 0) sawNonMultipleOf5 = true;
      }
    }
    expect(sawNonMultipleOf5).toBe(true);
  });

  it('tolerance never overlaps a neighbouring "nice" value at the basic tier (tolerance is strictly less than the 5° step)', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const questions = buildAnglesMeasureQuestions({ difficultyId: 'basic', count: 5, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        expect(challenge.toleranceDeg).toBeLessThan(5);
        // The acceptance window must not reach the next multiple of 5 in either direction.
        expect(challenge.targetDegrees - challenge.toleranceDeg).toBeGreaterThan(challenge.targetDegrees - 5);
        expect(challenge.targetDegrees + challenge.toleranceDeg).toBeLessThan(challenge.targetDegrees + 5);
      }
    }
  });

  it('tolerance gets tighter at higher difficulty tiers', () => {
    const questions = buildAnglesMeasureQuestions({ difficultyId: 'basic', count: 1, seed: 1 });
    const intermediate = buildAnglesMeasureQuestions({ difficultyId: 'intermediate', count: 1, seed: 1 });
    const advanced = buildAnglesMeasureQuestions({ difficultyId: 'advanced', count: 1, seed: 1 });
    expect(advanced[0].payload!.toleranceDeg).toBeLessThanOrEqual(intermediate[0].payload!.toleranceDeg);
    expect(advanced[0].payload!.toleranceDeg).toBeLessThanOrEqual(questions[0].payload!.toleranceDeg);
  });

  it("the protractor's baseline direction (the fixed ray's actual drawn direction) plus targetDegrees always lands exactly on the measured ray's actual drawn direction", () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 200; seed += 1) {
        const questions = buildAnglesMeasureQuestions({ difficultyId: difficulty, count: 6, seed });
        for (const question of questions) {
          const challenge = question.payload!;
          const fixedDeg = directionDegrees(challenge.vertex, challenge.fixedThrough);
          const measuredDeg = directionDegrees(challenge.vertex, challenge.measuredThrough);
          const expected = ((fixedDeg + challenge.targetDegrees) % 360 + 360) % 360;
          const actual = ((measuredDeg % 360) + 360) % 360;
          expect(Math.abs(expected - actual)).toBeLessThan(1e-6);
        }
      }
    }
  });

  it('the reference ray is always built at a simple, axis-aligned relative direction before scene rotation (0° in its own local frame)', () => {
    // At basic difficulty the rotation step is 90°, so the fixed ray's own
    // drawn direction must always land on an exact multiple of 90°.
    for (let seed = 0; seed < 200; seed += 1) {
      const questions = buildAnglesMeasureQuestions({ difficultyId: 'basic', count: 5, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        const fixedDeg = ((directionDegrees(challenge.vertex, challenge.fixedThrough) % 360) + 360) % 360;
        expect(Math.round(fixedDeg) % 90).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is registered with three difficulty levels and no personal-challenge eligibility beyond the shared pattern', () => {
    expect(anglesMeasureActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
    expect(anglesMeasureActivity.id).toBe('anglesMeasure');
  });
});
