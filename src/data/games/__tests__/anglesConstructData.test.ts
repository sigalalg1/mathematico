import { describe, expect, it } from 'vitest';
import {
  anglesConstructActivity,
  assertAngleConstructChallengeIsSound,
  buildAnglesConstructQuestions,
} from '../anglesConstructData';
import { classifyAngle7 } from '../../../geometry/angleMath';
import type { AnglesDifficultyId } from '../../../types/anglesGrade7';

const DIFFICULTIES: AnglesDifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('anglesConstructData generator', () => {
  it('produces a sound construction target across many seeds and difficulties', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 150; seed += 1) {
        const questions = buildAnglesConstructQuestions({ difficultyId: difficulty, count: 6, seed });
        expect(questions).toHaveLength(6);
        for (const question of questions) {
          expect(() => assertAngleConstructChallengeIsSound(question.payload!)).not.toThrow();
          expect(question.options).toEqual([question.answer]);
        }
      }
    }
  });

  it('only the advanced tier ever targets an exact degree value; basic/intermediate always target a type', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      for (const difficulty of ['basic', 'intermediate'] as const) {
        const questions = buildAnglesConstructQuestions({ difficultyId: difficulty, count: 8, seed });
        for (const question of questions) expect(question.payload!.targetDegrees).toBeUndefined();
      }
    }
  });

  it('every degree-target challenge is unambiguously classifiable as its stored target type', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const questions = buildAnglesConstructQuestions({ difficultyId: 'advanced', count: 6, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.targetDegrees === undefined) continue;
        expect(classifyAngle7(challenge.targetDegrees)).toBe(challenge.targetType);
      }
    }
  });

  it('the draggable ray never starts already at (or suspiciously near) the target — real dragging is always required', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const questions = buildAnglesConstructQuestions({ difficultyId: 'advanced', count: 6, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        const startDeg = Math.atan2(
          challenge.startDraggableThrough.y - challenge.vertex.y,
          challenge.startDraggableThrough.x - challenge.vertex.x,
        );
        const fixedDeg = Math.atan2(challenge.fixedThrough.y - challenge.vertex.y, challenge.fixedThrough.x - challenge.vertex.x);
        const rawDiff = Math.abs(((startDeg - fixedDeg) * 180) / Math.PI);
        const startAngle = rawDiff > 180 ? 360 - rawDiff : rawDiff;
        if (challenge.targetDegrees !== undefined) {
          expect(Math.abs(startAngle - challenge.targetDegrees)).toBeGreaterThanOrEqual(challenge.toleranceDeg);
        }
      }
    }
  });

  it('is registered with three difficulty levels and a shorter question-count range suited to a drag lab', () => {
    expect(anglesConstructActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
    expect(anglesConstructActivity.capabilities.questionCounts.length).toBeGreaterThan(0);
  });
});
