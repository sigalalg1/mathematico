import { describe, expect, it } from 'vitest';
import {
  allValidThreeLetterNames,
  canUseVertexOnlyName,
  greekLetterForIndex,
  invalidAngleName,
  isValidAngleName,
  namesReferToSameAngle,
  threeLetterName,
} from '../angleNotation';

describe('threeLetterName / isValidAngleName — chapter 21, middle letter is always the vertex', () => {
  it('accepts both orders of the outer letters', () => {
    expect(isValidAngleName('BAC', 'A', ['B', 'C'])).toBe(true);
    expect(isValidAngleName('CAB', 'A', ['B', 'C'])).toBe(true);
    expect(threeLetterName('B', 'A', 'C')).toBe('BAC');
  });

  it('rejects a name whose middle letter is not the vertex, even if the letters are otherwise right', () => {
    expect(isValidAngleName('ABC', 'A', ['B', 'C'])).toBe(false);
    expect(isValidAngleName('BCA', 'A', ['B', 'C'])).toBe(false);
  });

  it('rejects a name that uses an unrelated point', () => {
    expect(isValidAngleName('BAD', 'A', ['B', 'C'])).toBe(false);
  });

  it('rejects malformed lengths', () => {
    expect(isValidAngleName('BA', 'A', ['B', 'C'])).toBe(false);
    expect(isValidAngleName('BACD', 'A', ['B', 'C'])).toBe(false);
  });

  it('allValidThreeLetterNames returns exactly the two correct orderings', () => {
    expect(new Set(allValidThreeLetterNames('A', ['B', 'C']))).toEqual(new Set(['BAC', 'CAB']));
  });
});

describe('namesReferToSameAngle', () => {
  it('treats BGC / CGB as the same angle, and distinguishes a genuinely different angle at the same vertex', () => {
    expect(namesReferToSameAngle('BGC', 'CGB')).toBe(true);
    expect(namesReferToSameAngle('BGC', 'BGD')).toBe(false);
  });

  it('is false when the vertex (middle letter) differs even if outer letters match', () => {
    expect(namesReferToSameAngle('BAC', 'BCA')).toBe(false);
  });
});

describe('the chapter-21 worked example: ∠BGC, ∠G, ∠FGC, ∠CGB, ∠BGD, ∠CGF are a mix of equivalent and distinct names', () => {
  it('validator groups them exactly as the textbook does', () => {
    // ∠BGC and ∠CGB name the same angle (vertex G, arms B & C).
    expect(namesReferToSameAngle('BGC', 'CGB')).toBe(true);
    // ∠FGC and ∠CGF name the same angle (vertex G, arms F & C).
    expect(namesReferToSameAngle('FGC', 'CGF')).toBe(true);
    // ∠BGC and ∠FGC are different angles (different second arm).
    expect(namesReferToSameAngle('BGC', 'FGC')).toBe(false);
    // ∠BGD is yet another angle at the same vertex.
    expect(namesReferToSameAngle('BGC', 'BGD')).toBe(false);
  });
});

describe('canUseVertexOnlyName', () => {
  it('is only unambiguous when exactly two rays share the vertex', () => {
    expect(canUseVertexOnlyName(2)).toBe(true);
    expect(canUseVertexOnlyName(3)).toBe(false);
    expect(canUseVertexOnlyName(1)).toBe(false);
  });
});

describe('invalidAngleName distractor generator', () => {
  it('wrongVertex produces a name using only the angle\'s real letters, but with the wrong one in the middle', () => {
    const bad = invalidAngleName('A', ['B', 'C'], 'wrongVertex');
    expect(bad).toHaveLength(3);
    expect(isValidAngleName(bad, 'A', ['B', 'C'])).toBe(false);
    expect(new Set(bad)).toEqual(new Set(['A', 'B', 'C']));
  });

  it('wrongArm swaps in an unrelated point label', () => {
    const bad = invalidAngleName('A', ['B', 'C'], 'wrongArm', 'Z');
    expect(isValidAngleName(bad, 'A', ['B', 'C'])).toBe(false);
    expect(bad).toContain('Z');
  });
});

describe('greekLetterForIndex mnemonic (Alpha↔A, Beta↔B, Gamma↔G, Delta↔D)', () => {
  it('returns the four letters in order, then null', () => {
    expect(greekLetterForIndex(0)).toBe('α');
    expect(greekLetterForIndex(1)).toBe('β');
    expect(greekLetterForIndex(2)).toBe('γ');
    expect(greekLetterForIndex(3)).toBe('δ');
    expect(greekLetterForIndex(4)).toBeNull();
  });
});
