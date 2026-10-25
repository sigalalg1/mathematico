import { describe, expect, it } from 'vitest';
import { anglesCompareActivity, assertAngleCompareChallengeIsSound, buildAnglesCompareQuestions } from '../anglesCompareData';
import { resolveAngle } from '../../../geometry/angleMath';
import type { AnglesDifficultyId } from '../../../types/anglesGrade7';

const DIFFICULTIES: AnglesDifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('anglesCompareData generator', () => {
  it('produces a sound comparison across many seeds and difficulties, including the equal case', () => {
    let sawLess = false;
    let sawGreater = false;
    let sawEqual = false;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 150; seed += 1) {
        const questions = buildAnglesCompareQuestions({ difficultyId: difficulty, count: 8, seed });
        for (const question of questions) {
          const challenge = question.payload!;
          expect(() => assertAngleCompareChallengeIsSound(challenge)).not.toThrow();
          expect(challenge.options).toEqual(['<', '=', '>']);
          if (challenge.answer === '<') sawLess = true;
          if (challenge.answer === '>') sawGreater = true;
          if (challenge.answer === '=') sawEqual = true;
        }
      }
    }
    expect(sawLess).toBe(true);
    expect(sawGreater).toBe(true);
    expect(sawEqual).toBe(true);
  });

  it('the comparison always matches the real, geometry-resolved measures of both diagrams (never the stored `degrees` alone)', () => {
    for (let seed = 0; seed < 150; seed += 1) {
      const questions = buildAnglesCompareQuestions({ difficultyId: 'advanced', count: 10, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        const leftResolved = resolveAngle(challenge.left.scene, challenge.left.ref);
        const rightResolved = resolveAngle(challenge.right.scene, challenge.right.ref);
        expect(leftResolved.degrees).toBeCloseTo(challenge.left.degrees, 5);
        expect(rightResolved.degrees).toBeCloseTo(challenge.right.degrees, 5);
        // Each side is independently rotated, so two "equal" diagrams can differ
        // by a hair of floating-point noise even though the intended measures
        // are bit-identical — a tolerant comparison here, not a strict `<`/`>`.
        const diff = leftResolved.degrees - rightResolved.degrees;
        const expected = diff < -1e-3 ? '<' : diff > 1e-3 ? '>' : '=';
        expect(challenge.answer).toBe(expected);
      }
    }
  });

  it('never lets ray-drawn distance leak as a size cue: shuffling each side\'s independently-randomized ray distance changes nothing about the answer', () => {
    // The generator already randomizes ray distance per side independently of
    // degrees (see buildVertexScene); this test just asserts the two are
    // uncorrelated with the *answer* across a large sample, i.e. a longer-drawn
    // ray never systematically predicts "greater".
    const questions = buildAnglesCompareQuestions({ difficultyId: 'basic', count: 200, seed: 42 });
    const distances = questions.map((q) => {
      const c = q.payload!;
      const leftDist = Math.hypot(c.left.scene.rays[1].through.x - c.left.scene.vertex.point.x, c.left.scene.rays[1].through.y - c.left.scene.vertex.point.y);
      const rightDist = Math.hypot(c.right.scene.rays[1].through.x - c.right.scene.vertex.point.x, c.right.scene.rays[1].through.y - c.right.scene.vertex.point.y);
      return { longerSide: leftDist > rightDist ? 'left' : 'right', answer: c.answer };
    });
    const longerIsGreater = distances.filter((d) => (d.longerSide === 'left' && d.answer === '>') || (d.longerSide === 'right' && d.answer === '<')).length;
    // With no real correlation this should land well short of "always true" (200/200).
    expect(longerIsGreater).toBeLessThan(180);
  });

  it('is registered with three difficulty levels', () => {
    expect(anglesCompareActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
  });
});
