import { describe, expect, it } from 'vitest';
import { classifyMistake } from '../hitTheTargetMistakes';

describe('classifyMistake', () => {
  it('detects an X sign error', () => {
    expect(classifyMistake({ x: 3, y: 2 }, { x: -3, y: 2 })).toBe('xSign');
    expect(classifyMistake({ x: -4, y: -1 }, { x: 4, y: -1 })).toBe('xSign');
  });

  it('detects a Y sign error', () => {
    expect(classifyMistake({ x: 3, y: 2 }, { x: 3, y: -2 })).toBe('ySign');
    expect(classifyMistake({ x: -4, y: -1 }, { x: -4, y: 1 })).toBe('ySign');
  });

  it('detects swapped X/Y', () => {
    expect(classifyMistake({ x: 2, y: 5 }, { x: 5, y: 2 })).toBe('swapped');
    expect(classifyMistake({ x: -1, y: 4 }, { x: 4, y: -1 })).toBe('swapped');
  });

  it('never reports a swap when x === y, because the swap is indistinguishable from the right answer', () => {
    // (3,3) swapped is still (3,3) — a correct answer, never a mistake to classify.
    expect(classifyMistake({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe('other');
    expect(classifyMistake({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe('other');
  });

  it('prefers a sign error over a spurious swap when |x| === |y|', () => {
    // (2,-2): flipping x gives (-2,-2); swapping also gives (-2,2). They must not collide.
    expect(classifyMistake({ x: 2, y: -2 }, { x: -2, y: -2 })).toBe('xSign');
    expect(classifyMistake({ x: 2, y: -2 }, { x: 2, y: 2 })).toBe('ySign');
    // The true swap of (2,-2) is (-2,2) — classified as a swap only because x !== y.
    expect(classifyMistake({ x: 2, y: -2 }, { x: -2, y: 2 })).toBe('swapped');
  });

  it('does not call a zero coordinate a sign error (0 and -0 are the same point)', () => {
    expect(classifyMistake({ x: 0, y: 3 }, { x: 0, y: 3 })).toBe('other');
    expect(classifyMistake({ x: 4, y: 0 }, { x: 4, y: 0 })).toBe('other');
  });

  it('classifies an axis point answered off-axis as other, not a sign error', () => {
    expect(classifyMistake({ x: 4, y: 0 }, { x: 4, y: 2 })).toBe('other');
    expect(classifyMistake({ x: 0, y: -3 }, { x: 1, y: -3 })).toBe('other');
  });

  it('classifies a one-coordinate-off answer as other', () => {
    expect(classifyMistake({ x: 3, y: 2 }, { x: 4, y: 2 })).toBe('other');
    expect(classifyMistake({ x: 3, y: 2 }, { x: 3, y: 1 })).toBe('other');
  });

  it('classifies an unrelated wrong answer as other', () => {
    expect(classifyMistake({ x: 3, y: 2 }, { x: -5, y: 4 })).toBe('other');
  });

  it('always returns one of the four known mistake types', () => {
    const allowed = new Set(['xSign', 'ySign', 'swapped', 'other']);
    for (let tx = -5; tx <= 5; tx++) {
      for (let ty = -5; ty <= 5; ty++) {
        for (let ax = -5; ax <= 5; ax++) {
          for (let ay = -5; ay <= 5; ay++) {
            expect(allowed.has(classifyMistake({ x: tx, y: ty }, { x: ax, y: ay }))).toBe(true);
          }
        }
      }
    }
  });
});
