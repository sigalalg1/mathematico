import { describe, expect, it } from 'vitest';
import {
  composeFromUnits,
  countOfUnit,
  decomposeStandard,
  digitAt,
  firstDifferingPlace,
  formatNumber,
  isEven,
  isRoundingMidpoint,
  placeNameFor,
  PLACE_VALUES,
  roundingBenchmarks,
  roundTo,
  valueAt,
} from '../placeValue';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [5, '5'],
    [47325, '47,325'],
    [1000, '1,000'],
    [1000000, '1,000,000'],
    [999, '999'],
    [-4500, '-4,500'],
  ])('%i -> %s', (n, expected) => {
    expect(formatNumber(n)).toBe(expected);
  });
});

describe('digitAt / valueAt', () => {
  it('reads every digit of 463205 correctly', () => {
    expect(digitAt(463205, 100000)).toBe(4);
    expect(digitAt(463205, 10000)).toBe(6);
    expect(digitAt(463205, 1000)).toBe(3);
    expect(digitAt(463205, 100)).toBe(2);
    expect(digitAt(463205, 10)).toBe(0);
    expect(digitAt(463205, 1)).toBe(5);
  });

  it('the value of 6 in 463,205 is 60,000', () => {
    expect(valueAt(463205, 10000)).toBe(60000);
  });

  it('the value of 7 in 47,325 is 7,000', () => {
    expect(valueAt(47325, 1000)).toBe(7000);
  });
});

describe('the unit upper bound, 1,000,000', () => {
  it('is itself decomposable, not an edge case that falls off the place-value array', () => {
    expect(decomposeStandard(1000000)).toEqual([{ place: 1000000, digit: 1, value: 1000000 }]);
  });

  it('999,990 rounds up to exactly 1,000,000', () => {
    expect(roundTo(999990, 100000)).toBe(1000000);
  });
});

describe('decomposeStandard', () => {
  it('omits zero digits and orders largest place first', () => {
    expect(decomposeStandard(40325)).toEqual([
      { place: 10000, digit: 4, value: 40000 },
      { place: 100, digit: 3, value: 300 },
      { place: 10, digit: 2, value: 20 },
      { place: 1, digit: 5, value: 5 },
    ]);
  });

  it('every term sums back to the original number', () => {
    for (const n of [0, 5, 10, 100, 1000, 47325, 100000, 999999, 1000000]) {
      const sum = decomposeStandard(n).reduce((total, term) => total + term.value, 0);
      expect(sum).toBe(n);
    }
  });

  it('a round number decomposes to a single term', () => {
    expect(decomposeStandard(40000)).toEqual([{ place: 10000, digit: 4, value: 40000 }]);
  });
});

describe('countOfUnit / composeFromUnits', () => {
  it('how many tens are in 43,000? 4,300', () => {
    expect(countOfUnit(43000, 10)).toBe(4300);
  });

  it('how many hundreds are in 2,300? 23', () => {
    expect(countOfUnit(2300, 100)).toBe(23);
  });

  it('23 hundreds is 2,300', () => {
    expect(composeFromUnits(23, 100)).toBe(2300);
  });

  it('15 tens is 150', () => {
    expect(composeFromUnits(15, 10)).toBe(150);
  });

  it('composeFromUnits undoes countOfUnit exactly when the number is a multiple of the unit', () => {
    for (const unit of [10, 100, 1000, 10000] as const) {
      for (let n = 0; n <= 100000; n += unit * 7) {
        const rounded = n - (n % unit);
        expect(composeFromUnits(countOfUnit(rounded, unit), unit)).toBe(rounded);
      }
    }
  });
});

describe('roundTo / roundingBenchmarks / isRoundingMidpoint', () => {
  it('rounds down below the midpoint', () => {
    expect(roundTo(24620, 100)).toBe(24600);
    expect(roundTo(24, 100)).toBe(0);
  });

  it('rounds up at or above the midpoint ("round half up")', () => {
    expect(roundTo(24650, 100)).toBe(24700);
    expect(roundTo(50000, 100000)).toBe(100000);
  });

  it('673,952 is closer to 674,000 than 673,000', () => {
    expect(roundTo(673952, 1000)).toBe(674000);
  });

  it('an exact multiple rounds to itself', () => {
    expect(roundTo(24600, 100)).toBe(24600);
  });

  it('benchmarks always bracket the number', () => {
    for (let n = 0; n <= 200000; n += 2437) {
      for (const place of [10, 100, 1000, 10000] as const) {
        const { lower, upper } = roundingBenchmarks(n, place);
        expect(lower).toBeLessThanOrEqual(n);
        expect(upper).toBeGreaterThanOrEqual(n);
        expect(upper - lower).toBe(place);
        expect(lower % place).toBe(0);
      }
    }
  });

  it('every rounded result is one of its own two benchmarks', () => {
    for (let n = 0; n <= 200000; n += 1811) {
      for (const place of [10, 100, 1000, 10000] as const) {
        const { lower, upper } = roundingBenchmarks(n, place);
        expect([lower, upper]).toContain(roundTo(n, place));
      }
    }
  });

  it('identifies the exact midpoint', () => {
    expect(isRoundingMidpoint(24650, 100)).toBe(true);
    expect(isRoundingMidpoint(24620, 100)).toBe(false);
    expect(isRoundingMidpoint(50000, 100000)).toBe(true);
  });
});

describe('isEven', () => {
  it('classifies whole numbers correctly', () => {
    expect(isEven(0)).toBe(true);
    expect(isEven(2)).toBe(true);
    expect(isEven(47324)).toBe(true);
    expect(isEven(47325)).toBe(false);
  });
});

describe('firstDifferingPlace', () => {
  it('70,090 and 70,900 first differ at the hundreds place (0 vs 9)', () => {
    // 70,090 = 7 0 0 9 0 and 70,900 = 7 0 9 0 0 — the ten-thousands and
    // thousands digits both match (7 and 0); the first mismatch, reading
    // from the largest place down, is the hundreds digit (0 vs 9).
    expect(firstDifferingPlace(70090, 70900)).toBe(100);
  });

  it('returns null for equal numbers', () => {
    expect(firstDifferingPlace(12345, 12345)).toBeNull();
  });

  it('finds the true first differing place across many pairs', () => {
    for (let a = 0; a <= 100000; a += 3701) {
      for (let b = 0; b <= 100000; b += 9173) {
        const place = firstDifferingPlace(a, b);
        if (a === b) {
          expect(place).toBeNull();
          continue;
        }
        expect(place).not.toBeNull();
        // Every place above it must match, and this place itself must differ.
        const idx = PLACE_VALUES.indexOf(place!);
        for (let i = idx + 1; i < PLACE_VALUES.length; i += 1) {
          expect(digitAt(a, PLACE_VALUES[i])).toBe(digitAt(b, PLACE_VALUES[i]));
        }
        expect(digitAt(a, place!)).not.toBe(digitAt(b, place!));
      }
    }
  });
});

describe('placeNameFor', () => {
  it('maps every place value to its name', () => {
    expect(placeNameFor(1)).toBe('ones');
    expect(placeNameFor(10)).toBe('tens');
    expect(placeNameFor(100)).toBe('hundreds');
    expect(placeNameFor(1000)).toBe('thousands');
    expect(placeNameFor(10000)).toBe('tenThousands');
    expect(placeNameFor(100000)).toBe('hundredThousands');
  });
});
