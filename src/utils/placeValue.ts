/**
 * Shared base-10 place-value arithmetic for the Grade 4 "Decimal Place
 * Value" (המבנה העשרוני) exam-prep unit — numbers up to 1,000,000.
 *
 * "Decimal" here means the base-10 positional number system (עשרוני), not
 * decimal fractions: every number in this unit is a plain integer. All
 * arithmetic is therefore exact integer arithmetic — there is no
 * floating-point rounding to guard against anywhere in this module.
 */

// Includes the millions place so the unit's own upper bound (1,000,000) is
// itself a representable, decomposable number, not an edge case that falls
// off the end of the array.
export const PLACE_VALUES = [1, 10, 100, 1000, 10000, 100000, 1000000] as const;
export type PlaceValue = (typeof PLACE_VALUES)[number];

export const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands', 'tenThousands', 'hundredThousands', 'millions'] as const;
export type PlaceName = (typeof PLACE_NAMES)[number];

export function placeNameFor(place: PlaceValue): PlaceName {
  const index = PLACE_VALUES.indexOf(place);
  return PLACE_NAMES[index];
}

/** Thousands-grouped digits, e.g. 47325 -> "47,325". Always LTR digits. */
export function formatNumber(n: number): string {
  const sign = n < 0 ? '-' : '';
  const digits = Math.abs(Math.trunc(n)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${grouped}`;
}

/** The single digit (0-9) occupying a given place in `n`. */
export function digitAt(n: number, place: PlaceValue): number {
  return Math.floor(Math.abs(n) / place) % 10;
}

/** The value that digit contributes to `n`, e.g. valueAt(463205, 100000) -> 400000. */
export function valueAt(n: number, place: PlaceValue): number {
  return digitAt(n, place) * place;
}

export interface PlaceValueTerm {
  place: PlaceValue;
  digit: number;
  value: number;
}

/** Standard expanded notation, largest place first, zero digits omitted. */
export function decomposeStandard(n: number): PlaceValueTerm[] {
  const terms: PlaceValueTerm[] = [];
  for (let i = PLACE_VALUES.length - 1; i >= 0; i -= 1) {
    const place = PLACE_VALUES[i];
    const digit = digitAt(n, place);
    if (digit !== 0) terms.push({ place, digit, value: digit * place });
  }
  return terms;
}

/** How many whole `unit`s fit in `n` (e.g. countOfUnit(43000, 10) -> 4300). */
export function countOfUnit(n: number, unit: PlaceValue): number {
  return Math.floor(n / unit);
}

/** The number represented by `count` whole `unit`s (e.g. composeFromUnits(23, 100) -> 2300). */
export function composeFromUnits(count: number, unit: PlaceValue): number {
  return count * unit;
}

/** The two multiples of `place` that `n` sits between (inclusive if `n` is already one of them). */
export function roundingBenchmarks(n: number, place: PlaceValue): { lower: number; upper: number } {
  const lower = n - (n % place);
  return { lower, upper: lower + place };
}

/**
 * Rounds `n` to the nearest multiple of `place`, "round half up" (the
 * convention taught in Grade 4 — exactly at the midpoint always rounds to
 * the larger benchmark, never down). Pure integer arithmetic throughout —
 * every value here is a whole number, so there is no float-division
 * precision risk to guard against.
 */
export function roundTo(n: number, place: PlaceValue): number {
  const { lower, upper } = roundingBenchmarks(n, place);
  const remainder = n - lower;
  return remainder * 2 >= place ? upper : lower;
}

/** Whether `n` is exactly at the midpoint between its two rounding benchmarks. */
export function isRoundingMidpoint(n: number, place: PlaceValue): boolean {
  const { lower, upper } = roundingBenchmarks(n, place);
  return n - lower === upper - n;
}

export function isEven(n: number): boolean {
  return n % 2 === 0;
}

/** The first place (largest to smallest) at which two numbers' digits differ, or null if equal. */
export function firstDifferingPlace(a: number, b: number): PlaceValue | null {
  for (let i = PLACE_VALUES.length - 1; i >= 0; i -= 1) {
    const place = PLACE_VALUES[i];
    if (digitAt(a, place) !== digitAt(b, place)) return place;
  }
  return null;
}
